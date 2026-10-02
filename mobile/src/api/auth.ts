import { api, normalizeEmail } from './client';

export type AuthResponse = {
  accessToken: string;
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    hasProfile: boolean;
  };
};

export const authApi = {
  register: (email: string, password: string) =>
    api
      .post('/auth/register', { email: normalizeEmail(email), password })
      .then((r) => r.data),

  verifyOtp: (email: string, code: string) =>
    api
      .post<AuthResponse>('/auth/verify-otp', { email: normalizeEmail(email), code })
      .then((r) => r.data),

  resendOtp: (email: string) =>
    api.post('/auth/resend-otp', { email: normalizeEmail(email) }).then((r) => r.data),

  login: (email: string, password: string) =>
    api
      .post<AuthResponse>('/auth/login', { email: normalizeEmail(email), password })
      .then((r) => r.data),
};