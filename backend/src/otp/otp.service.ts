import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt, createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export type OtpErrorCode =
  | 'OTP_INVALID'
  | 'OTP_EXPIRED'
  | 'OTP_ATTEMPTS_EXCEEDED'
  | 'OTP_COOLDOWN';

export class OtpError extends Error {
  constructor(public code: OtpErrorCode, message: string) {
    super(message);
  }
}

@Injectable()
export class OtpService {
  private readonly secret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    // Key for the OTP hash. Falls back to JWT_SECRET so no new env var is required.
    this.secret =
      this.config.get<string>('OTP_SECRET') ??
      this.config.getOrThrow<string>('JWT_SECRET');
  }

  // -------- Pure helpers (unit-tested) --------

  /** 6-digit numeric code, leading zeros allowed. */
  generateCode(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  /**
   * Keyed hash (HMAC-SHA256) of userId + code.
   * A plain SHA-256 of a 6-digit code can be reversed from a leaked table in
   * milliseconds (only 1,000,000 possibilities). Keying it with a server secret
   * and binding it to the user fixes that while staying fast, unlike bcrypt.
   */
  hashCode(userId: string, code: string): string {
    return createHmac('sha256', this.secret)
      .update(`${userId}:${code}`)
      .digest('hex');
  }

  /** Constant-time comparison against a stored hash. */
  codeMatches(userId: string, code: string, storedHash: string): boolean {
    const a = Buffer.from(this.hashCode(userId, code), 'hex');
    const b = Buffer.from(storedHash, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  }

  isExpired(expiresAt: Date, now: Date = new Date()): boolean {
    return expiresAt.getTime() <= now.getTime();
  }

  // -------- DB-backed operations --------

  /** Creates a new code and returns the plaintext so the caller can email it. */
  async issueForUser(userId: string): Promise<string> {
    const ttlMinutes = Number(this.config.get('OTP_TTL_MINUTES', 10));
    const cooldownSeconds = Number(
      this.config.get('OTP_RESEND_COOLDOWN_SECONDS', 30),
    );

    const last = await this.prisma.otpCode.findFirst({
      where: { userId, consumed: false },
      orderBy: { createdAt: 'desc' },
    });

    if (last) {
      const ageSec = (Date.now() - last.createdAt.getTime()) / 1000;
      if (ageSec < cooldownSeconds) {
        const wait = Math.ceil(cooldownSeconds - ageSec);
        throw new OtpError(
          'OTP_COOLDOWN',
          `Please wait ${wait}s before requesting a new code.`,
        );
      }
      // invalidate the previous code
      await this.prisma.otpCode.update({
        where: { id: last.id },
        data: { consumed: true },
      });
    }

    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    await this.prisma.otpCode.create({
      data: { userId, codeHash: this.hashCode(userId, code), expiresAt },
    });

    // The plaintext code is never logged or stored; only the hash is persisted.
    return code;
  }

  async verifyForUser(userId: string, code: string): Promise<void> {
    const maxAttempts = Number(this.config.get('OTP_MAX_ATTEMPTS', 5));

    // Only unconsumed codes are considered, so a used code reads as "no active code"
    const record = await this.prisma.otpCode.findFirst({
      where: { userId, consumed: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new OtpError('OTP_INVALID', 'No active code. Request a new one.');
    }
    if (this.isExpired(record.expiresAt)) {
      throw new OtpError('OTP_EXPIRED', 'This code has expired. Request a new one.');
    }
    if (record.attempts >= maxAttempts) {
      throw new OtpError(
        'OTP_ATTEMPTS_EXCEEDED',
        'Too many wrong attempts. Request a new code.',
      );
    }

    // Count this attempt atomically BEFORE comparing. Parallel requests cannot
    // all read "attempts = 0": the `lt` condition makes the database enforce the limit.
    const claimed = await this.prisma.otpCode.updateMany({
      where: { id: record.id, consumed: false, attempts: { lt: maxAttempts } },
      data: { attempts: { increment: 1 } },
    });
    if (claimed.count === 0) {
      throw new OtpError(
        'OTP_ATTEMPTS_EXCEEDED',
        'Too many wrong attempts. Request a new code.',
      );
    }

    if (!this.codeMatches(userId, code, record.codeHash)) {
      throw new OtpError('OTP_INVALID', 'Incorrect code.');
    }

    // Consume atomically: if two requests send the right code at once, only one wins
    const consumed = await this.prisma.otpCode.updateMany({
      where: { id: record.id, consumed: false },
      data: { consumed: true },
    });
    if (consumed.count === 0) {
      throw new OtpError('OTP_INVALID', 'This code was already used.');
    }
  }
}