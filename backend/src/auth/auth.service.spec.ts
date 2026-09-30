import { describe, it, expect } from 'vitest';
import { vi } from 'vitest';
import { AuthService } from './auth.service';
import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService — login rules', () => {
  let svc: AuthService;

  function makeDeps(overrides: any = {}) {
    const prisma = {
      user: {
        findUnique: overrides.findUnique ?? vi.fn().mockResolvedValue(null),
        update: vi.fn(),
        create: vi.fn(),
      },
      profile: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as any;
    const otp = { issueForUser: vi.fn(), verifyForUser: vi.fn() } as any;
    const mail = { sendOtp: vi.fn() } as any;
    const jwt = { signAsync: vi.fn().mockResolvedValue('token') } as any;
    return { prisma, otp, mail, jwt };
  }

  it('rejects login for unknown email with generic message', async () => {
    const deps = makeDeps();
    svc = new AuthService(deps.prisma, deps.otp, deps.mail, deps.jwt);

    await expect(
      svc.login({ email: 'nobody@x.com', password: 'whatever' }),
    ).rejects.toMatchObject({
      response: { error: 'INVALID_CREDENTIALS' },
    });
  });

  it('rejects login for unverified user', async () => {
    const hash = await bcrypt.hash('password123', 4);
    const deps = makeDeps({
      findUnique: vi.fn().mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        passwordHash: hash,
        emailVerified: false,
      }),
    });
    svc = new AuthService(deps.prisma, deps.otp, deps.mail, deps.jwt);

    await expect(
      svc.login({ email: 'a@b.com', password: 'password123' }),
    ).rejects.toMatchObject({
      response: { error: 'EMAIL_NOT_VERIFIED' },
    });
  });

  it('rejects login for wrong password', async () => {
    const hash = await bcrypt.hash('password123', 4);
    const deps = makeDeps({
      findUnique: vi.fn().mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        passwordHash: hash,
        emailVerified: true,
      }),
    });
    svc = new AuthService(deps.prisma, deps.otp, deps.mail, deps.jwt);

    await expect(
      svc.login({ email: 'a@b.com', password: 'wrongpass' }),
    ).rejects.toMatchObject({
      response: { error: 'INVALID_CREDENTIALS' },
    });
  });

  it('returns a token for a verified user with correct password', async () => {
    const hash = await bcrypt.hash('password123', 4);
    const deps = makeDeps({
      findUnique: vi.fn().mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        passwordHash: hash,
        emailVerified: true,
      }),
    });
    svc = new AuthService(deps.prisma, deps.otp, deps.mail, deps.jwt);

    const res = await svc.login({ email: 'a@b.com', password: 'password123' });
    expect(res.accessToken).toBe('token');
    expect(res.user.hasProfile).toBe(false);
  });

  it('rejects duplicate email on register', async () => {
    const deps = makeDeps({
      findUnique: vi.fn().mockResolvedValue({ id: 'u1' }),
    });
    svc = new AuthService(deps.prisma, deps.otp, deps.mail, deps.jwt);

    await expect(
      svc.register({ email: 'a@b.com', password: 'password123' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});