import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OtpService } from './otp.service';

const cfg = {
  get: (key: string, def?: any) => {
    const map: Record<string, any> = {
      OTP_TTL_MINUTES: 10,
      OTP_MAX_ATTEMPTS: 5,
      OTP_RESEND_COOLDOWN_SECONDS: 30,
    };
    return map[key] ?? def;
  },
  getOrThrow: (key: string) => {
    if (key === 'JWT_SECRET') return 'test-secret';
    throw new Error(`missing ${key}`);
  },
} as any;

describe('OtpService: pure logic', () => {
  let svc: OtpService;

  beforeEach(() => {
    svc = new OtpService({} as any, cfg);
  });

  it('generates a 6-digit numeric code', () => {
    for (let i = 0; i < 100; i++) {
      expect(svc.generateCode()).toMatch(/^\d{6}$/);
    }
  });

  it('keeps leading zeros (always 6 characters)', () => {
    const codes = Array.from({ length: 200 }, () => svc.generateCode());
    expect(codes.every((c) => c.length === 6)).toBe(true);
  });

  it('hashes deterministically and never as plaintext', () => {
    const h1 = svc.hashCode('u1', '123456');
    expect(h1).toBe(svc.hashCode('u1', '123456'));
    expect(h1).not.toContain('123456');
    expect(h1).toHaveLength(64);
  });

  it('binds the hash to the user and the code', () => {
    expect(svc.hashCode('u1', '123456')).not.toBe(svc.hashCode('u2', '123456'));
    expect(svc.hashCode('u1', '123456')).not.toBe(svc.hashCode('u1', '654321'));
  });

  it('is keyed: a different secret gives a different hash', () => {
    const other = new OtpService({} as any, {
      ...cfg,
      getOrThrow: () => 'another-secret',
    });
    expect(other.hashCode('u1', '123456')).not.toBe(svc.hashCode('u1', '123456'));
  });

  it('matches only the correct code', () => {
    const stored = svc.hashCode('u1', '123456');
    expect(svc.codeMatches('u1', '123456', stored)).toBe(true);
    expect(svc.codeMatches('u1', '123457', stored)).toBe(false);
    expect(svc.codeMatches('u2', '123456', stored)).toBe(false);
    expect(svc.codeMatches('u1', '123456', 'not-hex')).toBe(false);
  });

  it('detects expiry', () => {
    const now = new Date();
    expect(svc.isExpired(new Date(now.getTime() - 1), now)).toBe(true);
    expect(svc.isExpired(new Date(now.getTime() + 60_000), now)).toBe(false);
    expect(svc.isExpired(now, now)).toBe(true);
  });
});

describe('OtpService: DB-backed rules (in-memory stub)', () => {
  function makePrismaStub() {
    const rows: any[] = [];
    let id = 0;
    const matches = (r: any, where: any) =>
      (where.id === undefined || r.id === where.id) &&
      (where.userId === undefined || r.userId === where.userId) &&
      (where.consumed === undefined || r.consumed === where.consumed) &&
      (where.attempts?.lt === undefined || r.attempts < where.attempts.lt);
    const apply = (r: any, data: any) => {
      if (data.attempts?.increment) r.attempts += data.attempts.increment;
      if (data.consumed !== undefined) r.consumed = data.consumed;
    };
    return {
      rows,
      otpCode: {
        findFirst: async ({ where }: any) =>
          rows
            .filter((r) => matches(r, where))
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null,
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
          apply(row, data);
          return row;
        },
        // atomic: check and write in one synchronous step, like a single SQL UPDATE
        updateMany: async ({ where, data }: any) => {
          const hit = rows.filter((r) => matches(r, where));
          hit.forEach((r) => apply(r, data));
          return { count: hit.length };
        },
      },
    } as any;
  }

  function setup() {
    const prisma = makePrismaStub();
    const svc = new OtpService(prisma, cfg);
    return { prisma, svc };
  }

  afterEach(() => vi.useRealTimers());

  it('stores only a hash and sets a 10-minute expiry', async () => {
    const { prisma, svc } = setup();
    const code = await svc.issueForUser('u1');
    const row = prisma.rows[0];

    expect(JSON.stringify(row)).not.toContain(code);
    expect(row.codeHash).toBe(svc.hashCode('u1', code));
    const minutes = (row.expiresAt.getTime() - Date.now()) / 60_000;
    expect(minutes).toBeGreaterThan(9.9);
    expect(minutes).toBeLessThanOrEqual(10);
  });

  it('accepts the correct code', async () => {
    const { svc } = setup();
    const code = await svc.issueForUser('u1');
    await expect(svc.verifyForUser('u1', code)).resolves.toBeUndefined();
  });

  it('rejects an expired code', async () => {
    const { prisma, svc } = setup();
    await prisma.otpCode.create({
      data: { userId: 'u1', codeHash: svc.hashCode('u1', '111111'), expiresAt: new Date(Date.now() - 1000) },
    });
    await expect(svc.verifyForUser('u1', '111111')).rejects.toMatchObject({ code: 'OTP_EXPIRED' });
  });

  it('locks the code after 5 wrong attempts, even for the right code', async () => {
    const { prisma, svc } = setup();
    await prisma.otpCode.create({
      data: { userId: 'u1', codeHash: svc.hashCode('u1', '222222'), expiresAt: new Date(Date.now() + 60_000) },
    });
    for (let i = 0; i < 5; i++) {
      await expect(svc.verifyForUser('u1', '000000')).rejects.toMatchObject({ code: 'OTP_INVALID' });
    }
    await expect(svc.verifyForUser('u1', '222222')).rejects.toMatchObject({ code: 'OTP_ATTEMPTS_EXCEEDED' });
  });

  it('cannot be brute-forced with parallel requests (atomic attempt limit)', async () => {
    const { prisma, svc } = setup();
    await prisma.otpCode.create({
      data: { userId: 'u1', codeHash: svc.hashCode('u1', '222222'), expiresAt: new Date(Date.now() + 60_000) },
    });
    const results = await Promise.allSettled(
      Array.from({ length: 12 }, () => svc.verifyForUser('u1', '000000')),
    );
    const codes = results.map((r: any) => r.reason.code);
    expect(codes.filter((c) => c === 'OTP_INVALID')).toHaveLength(5);
    expect(codes.filter((c) => c === 'OTP_ATTEMPTS_EXCEEDED')).toHaveLength(7);
    expect(prisma.rows[0].attempts).toBe(5);
  });

  it('is single-use', async () => {
    const { svc } = setup();
    const code = await svc.issueForUser('u1');
    await svc.verifyForUser('u1', code);
    await expect(svc.verifyForUser('u1', code)).rejects.toMatchObject({ code: 'OTP_INVALID' });
  });

  it('lets only one of two simultaneous correct submissions succeed', async () => {
    const { svc } = setup();
    const code = await svc.issueForUser('u1');
    const results = await Promise.allSettled([
      svc.verifyForUser('u1', code),
      svc.verifyForUser('u1', code),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });

  it('enforces the resend cooldown', async () => {
    const { svc } = setup();
    await svc.issueForUser('u1');
    await expect(svc.issueForUser('u1')).rejects.toMatchObject({ code: 'OTP_COOLDOWN' });
  });

  it('allows a resend after the cooldown, invalidating the old code and resetting attempts', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const { prisma, svc } = setup();

    const first = await svc.issueForUser('u1');
    for (let i = 0; i < 3; i++) {
      await expect(svc.verifyForUser('u1', '000000')).rejects.toMatchObject({ code: 'OTP_INVALID' });
    }
    expect(prisma.rows[0].attempts).toBe(3);

    vi.setSystemTime(Date.now() + 31_000);
    const second = await svc.issueForUser('u1');

    expect(prisma.rows[0].consumed).toBe(true); // old code invalidated
    expect(prisma.rows[1].attempts).toBe(0); // fresh counter
    if (first !== second) {
      await expect(svc.verifyForUser('u1', first)).rejects.toMatchObject({ code: 'OTP_INVALID' });
    }
    await expect(svc.verifyForUser('u1', second)).resolves.toBeUndefined();
  });
});