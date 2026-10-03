import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { OtpService, OtpError } from '../otp/otp.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const BCRYPT_ROUNDS = 10;
// Compared against when the email is unknown, so response time doesn't reveal
// which emails have accounts.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly mail: MailService,
    private readonly jwt: JwtService,
  ) {}

  // ---------- REGISTER ----------
  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException({
        error: 'EMAIL_TAKEN',
        message: 'An account with this email already exists.',
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: { email, passwordHash },
    });

    try {
      const code = await this.otp.issueForUser(user.id);
      await this.mail.sendOtp(email, code);
    } catch (err) {
      this.logger.error(
        `Failed to send OTP for ${email}: ${(err as Error).message}`,
      );
      // The user exists, so they can request a new code with "resend".
      throw new BadRequestException({
        error: 'OTP_SEND_FAILED',
        message: 'Account created, but we could not send the code. Try resend.',
      });
    }

    return {
      message: 'Verification code sent to your email.',
      email,
    };
  }

  // ---------- RESEND OTP ----------
  async resendOtp(email: string) {
    email = email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Do not leak whether an email exists. Return a generic success.
      return { message: 'If an account exists, a new code has been sent.' };
    }
    if (user.emailVerified) {
      throw new BadRequestException({
        error: 'ALREADY_VERIFIED',
        message: 'This email is already verified. Please log in.',
      });
    }

    let code: string;
    try {
      code = await this.otp.issueForUser(user.id);
    } catch (err) {
      if (err instanceof OtpError) {
        throw new BadRequestException({ error: err.code, message: err.message });
      }
      throw err;
    }

    try {
      await this.mail.sendOtp(email, code);
    } catch (err) {
      this.logger.error(
        `Failed to resend OTP for ${email}: ${(err as Error).message}`,
      );
      throw new BadRequestException({
        error: 'OTP_SEND_FAILED',
        message: 'We could not send the code. Please try again in a moment.',
      });
    }

    return { message: 'A new code has been sent.' };
  }

  // ---------- VERIFY OTP ----------
  async verifyOtp(email: string, code: string) {
    email = email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException({
        error: 'OTP_INVALID',
        message: 'Incorrect code.',
      });
    }

    // An already-verified account must never get a token from this endpoint:
    // that would let anyone who knows the email skip the password check.
    if (user.emailVerified) {
      throw new BadRequestException({
        error: 'ALREADY_VERIFIED',
        message: 'This email is already verified. Please log in.',
      });
    }

    try {
      await this.otp.verifyForUser(user.id, code);
    } catch (err) {
      if (err instanceof OtpError) {
        throw new BadRequestException({ error: err.code, message: err.message });
      }
      throw err;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });

    return this.issueToken(user.id, email);
  }

  // ---------- LOGIN ----------
  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({ where: { email } });

    // Always run a compare so timing doesn't reveal whether the email exists
    const ok = await bcrypt.compare(dto.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) {
      throw new UnauthorizedException({
        error: 'INVALID_CREDENTIALS',
        message: 'Incorrect email or password.',
      });
    }

    // Only reached with the correct password, so this doesn't leak which
    // emails are registered.
    if (!user.emailVerified) {
      throw new UnauthorizedException({
        error: 'EMAIL_NOT_VERIFIED',
        message: 'Verify your email before logging in.',
      });
    }

    return this.issueToken(user.id, email);
  }

  // ---------- HELPERS ----------
  private async issueToken(userId: string, email: string) {
    const payload = { sub: userId, email };
    const accessToken = await this.jwt.signAsync(payload);

    // Tell the client whether the profile has been completed, so it can decide
    // whether to show the first-login profile screen.
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    return {
      accessToken,
      user: {
        id: userId,
        email,
        emailVerified: true,
        hasProfile: !!profile,
      },
    };
  }
}