import { describe, it, expect, beforeEach } from 'vitest';
import { OtpService, OtpError } from './otp.service';

describe('OtpService — pure logic', () => {
  const cfg = {
    get: (key: string, def?: any) => {
      const map: Record<string, any> = {
        OTP_TTL_MINUTES: 10,
        OTP_MAX_ATTEMPTS: 5,
        OTP_RESEND_COOLDOWN_SECONDS: 30,
      };
      return map[key] ?? def;
    },
  } as any;

  let svc: OtpService;

  beforeEach(() => {
    svc = new OtpService({} as any, cfg);
  });

  it('generates a 6-digit numeric code', () => {
    for (let i = 0; i < 100; i++) {
      const code = svc.generateCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });

  it('allows leading zeros (pads to 6 digits)', () => {
    const codes = Array.from({ length: 200 }, () => svc.generateCode());
    expect(codes.every((c) => c.length === 6)).toBe(true);
  });

  it('hashes deterministically and not as plaintext', () => {
    const h1 = svc.hashCode('123456');
    const h2 = svc.hashCode('123456');
    expect(h1).toBe(h2);
    expect(h1).not.toBe('123456');
    expect(h1).toHaveLength(64);
  });

  it('detects expiry', () => {
    const now = new Date();
    const future = new Date(now.getTime() + 60_000);
    const past = new Date(now.getTime() - 1);

    expect(svc.isExpired(past, now)).toBe(true);
    expect(svc.isExpired(future, now)).toBe(false);
    expect(svc.isExpired(now, now)).toBe(true);
  });
});

describe('OtpService — DB-backed rules (in-memory stubs)', () => {
  const cfg = {
    get: (key: string, def?: any) => {
      const map: Record<string, any> = {
        OTP_TTL_MINUTES: 10,
        OTP_MAX_ATTEMPTS: 5,
        OTP_RESEND_COOLDOWN_SECONDS: 30,
      };
      return map[key] ?? def;
    },
  } as any;

  function makePrismaStub() {
    const rows: any[] = [];
    let id = 0;
    return {
      rows,
      otpCode: {
        findFirst: async ({ where }: any) => {
          return (
            rows
              .filter(
                (r) =>
                  r.userId === where.userId &&
                  (where.consumed === undefined || r.consumed === where.consumed),
              )
              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null
          );
        },
        create: async ({ data }: any) => {
          const row = {
            id: `r${++id}`,
            attempts: 0,
            consumed: false,
            createdAt: new Date(),
            ...data,
          };
          rows.push(row);
          return row;
        },
        update: async ({ where, data }: any) => {
          const row = rows.find((r) => r.id === where.id);
          if (!row) throw new Error('not found');
          if (data.attempts?.increment) row.attempts += data.attempts.increment;
          if (data.consumed !== undefined) row.consumed = data.consumed;
          return row;
        },
      },
    } as any;
  }

  it('rejects a code that is expired', async () => {
    const prisma = makePrismaStub();
    const svc = new OtpService(prisma, cfg);
    await prisma.otpCode.create({
      data: {
        userId: 'u1',
        codeHash: svc.hashCode('111111'),
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    await expect(svc.verifyForUser('u1', '111111')).rejects.toMatchObject({
      code: 'OTP_EXPIRED',
    });
  });

  it('rejects a code after 5 wrong attempts', async () => {
    const prisma = makePrismaStub();
    const svc = new OtpService(prisma, cfg);
    await prisma.otpCode.create({
      data: {
        userId: 'u1',
        codeHash: svc.hashCode('222222'),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    for (let i = 0; i < 5; i++) {
      await expect(svc.verifyForUser('u1', '000000')).rejects.toMatchObject({
        code: 'OTP_INVALID',
      });
    }
    await expect(svc.verifyForUser('u1', '222222')).rejects.toMatchObject({
      code: 'OTP_ATTEMPTS_EXCEEDED',
    });
  });

  it('is single-use', async () => {
    const prisma = makePrismaStub();
    const svc = new OtpService(prisma, cfg);
    await prisma.otpCode.create({
      data: {
        userId: 'u1',
        codeHash: svc.hashCode('333333'),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    await svc.verifyForUser('u1', '333333');
    await expect(svc.verifyForUser('u1', '333333')).rejects.toMatchObject({
      code: 'OTP_INVALID',
    });
  });

  it('enforces resend cooldown', async () => {
    const prisma = makePrismaStub();
    const svc = new OtpService(prisma, cfg);

    await svc.issueForUser('u1');
    await expect(svc.issueForUser('u1')).rejects.toMatchObject({
      code: 'OTP_COOLDOWN',
    });
  });
});