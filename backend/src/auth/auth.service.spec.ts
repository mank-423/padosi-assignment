import { describe, it, expect, vi } from 'vitest';
import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { OtpError } from '../otp/otp.service';

function makeDeps(overrides: any = {}) {
  const prisma = {
    user: {
      findUnique: overrides.findUnique ?? vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
      create: overrides.create ?? vi.fn().mockResolvedValue({ id: 'u1' }),
    },
    profile: { findUnique: vi.fn().mockResolvedValue(null) },
  } as any;
  const otp = {
    issueForUser: overrides.issueForUser ?? vi.fn().mockResolvedValue('123456'),
    verifyForUser: overrides.verifyForUser ?? vi.fn().mockResolvedValue(undefined),
  } as any;
  const mail = { sendOtp: overrides.sendOtp ?? vi.fn().mockResolvedValue(undefined) } as any;
  const jwt = { signAsync: vi.fn().mockResolvedValue('token') } as any;
  return { prisma, otp, mail, jwt, svc: new AuthService(prisma, otp, mail, jwt) };
}

const userRow = async (emailVerified: boolean) => ({
  id: 'u1',
  email: 'a@b.com',
  passwordHash: await bcrypt.hash('password123', 4),
  emailVerified,
});

describe('AuthService: login rules', () => {
  it('rejects an unknown email with a generic message', async () => {
    const { svc } = makeDeps();
    await expect(svc.login({ email: 'nobody@x.com', password: 'whatever' })).rejects.toMatchObject({
      response: { error: 'INVALID_CREDENTIALS' },
    });
  });

  it('rejects an unverified user who has the right password', async () => {
    const { svc } = makeDeps({ findUnique: vi.fn().mockResolvedValue(await userRow(false)) });
    await expect(svc.login({ email: 'a@b.com', password: 'password123' })).rejects.toMatchObject({
      response: { error: 'EMAIL_NOT_VERIFIED' },
    });
  });

  it('does not reveal that an email is unverified when the password is wrong', async () => {
    const { svc } = makeDeps({ findUnique: vi.fn().mockResolvedValue(await userRow(false)) });
    await expect(svc.login({ email: 'a@b.com', password: 'wrongpass' })).rejects.toMatchObject({
      response: { error: 'INVALID_CREDENTIALS' },
    });
  });

  it('rejects a wrong password', async () => {
    const { svc } = makeDeps({ findUnique: vi.fn().mockResolvedValue(await userRow(true)) });
    await expect(svc.login({ email: 'a@b.com', password: 'wrongpass' })).rejects.toMatchObject({
      response: { error: 'INVALID_CREDENTIALS' },
    });
  });

  it('returns a token for a verified user with the right password', async () => {
    const { svc } = makeDeps({ findUnique: vi.fn().mockResolvedValue(await userRow(true)) });
    const res = await svc.login({ email: 'a@b.com', password: 'password123' });
    expect(res.accessToken).toBe('token');
    expect(res.user.hasProfile).toBe(false);
  });
});

describe('AuthService: verifyOtp', () => {
  it('never issues a token for an already-verified account', async () => {
    const { svc, jwt, otp } = makeDeps({ findUnique: vi.fn().mockResolvedValue(await userRow(true)) });
    await expect(svc.verifyOtp('a@b.com', '123456')).rejects.toMatchObject({
      response: { error: 'ALREADY_VERIFIED' },
    });
    expect(jwt.signAsync).not.toHaveBeenCalled();
    expect(otp.verifyForUser).not.toHaveBeenCalled();
  });

  it('marks the user verified and returns a token for a correct code', async () => {
    const { svc, prisma } = makeDeps({ findUnique: vi.fn().mockResolvedValue(await userRow(false)) });
    const res = await svc.verifyOtp('a@b.com', '123456');
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { emailVerified: true } });
    expect(res.accessToken).toBe('token');
  });

  it('maps a wrong code to a 400 and does not verify the user', async () => {
    const { svc, prisma } = makeDeps({
      findUnique: vi.fn().mockResolvedValue(await userRow(false)),
      verifyForUser: vi.fn().mockRejectedValue(new OtpError('OTP_INVALID', 'Incorrect code.')),
    });
    await expect(svc.verifyOtp('a@b.com', '000000')).rejects.toMatchObject({
      response: { error: 'OTP_INVALID' },
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('treats an unknown email like a wrong code', async () => {
    const { svc } = makeDeps();
    await expect(svc.verifyOtp('nobody@x.com', '123456')).rejects.toMatchObject({
      response: { error: 'OTP_INVALID' },
    });
  });
});

describe('AuthService: register and resend', () => {
  it('rejects a duplicate email', async () => {
    const { svc } = makeDeps({ findUnique: vi.fn().mockResolvedValue({ id: 'u1' }) });
    await expect(svc.register({ email: 'a@b.com', password: 'password123' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('stores a bcrypt hash, never the plaintext password', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'u1' });
    const { svc } = makeDeps({ create });
    await svc.register({ email: 'A@B.com ', password: 'password123' });

    const data = create.mock.calls[0][0].data;
    expect(data.email).toBe('a@b.com');
    expect(data.passwordHash).not.toBe('password123');
    expect(JSON.stringify(data)).not.toContain('password123');
    expect(await bcrypt.compare('password123', data.passwordHash)).toBe(true);
  });

  it('reports OTP_SEND_FAILED when the email cannot be sent on register', async () => {
    const { svc } = makeDeps({ sendOtp: vi.fn().mockRejectedValue(new Error('smtp down')) });
    await expect(svc.register({ email: 'a@b.com', password: 'password123' })).rejects.toMatchObject({
      response: { error: 'OTP_SEND_FAILED' },
    });
  });

  it('returns the cooldown error on an early resend', async () => {
    const { svc } = makeDeps({
      findUnique: vi.fn().mockResolvedValue(await userRow(false)),
      issueForUser: vi.fn().mockRejectedValue(new OtpError('OTP_COOLDOWN', 'Please wait 25s before requesting a new code.')),
    });
    await expect(svc.resendOtp('a@b.com')).rejects.toMatchObject({
      response: { error: 'OTP_COOLDOWN' },
    });
  });

  it('reports OTP_SEND_FAILED when a resend email fails', async () => {
    const { svc } = makeDeps({
      findUnique: vi.fn().mockResolvedValue(await userRow(false)),
      sendOtp: vi.fn().mockRejectedValue(new Error('smtp down')),
    });
    await expect(svc.resendOtp('a@b.com')).rejects.toMatchObject({
      response: { error: 'OTP_SEND_FAILED' },
    });
  });

  it('does not reveal whether an email exists on resend', async () => {
    const { svc } = makeDeps();
    await expect(svc.resendOtp('nobody@x.com')).resolves.toMatchObject({ message: expect.any(String) });
  });
});