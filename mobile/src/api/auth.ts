import { api } from './client';

export const authApi = {
  register: (email: string, password: string) =>
    api.post('/auth/register', { email, password }).then((r) => r.data),

  verifyOtp: (email: string, code: string) =>
    api.post('/auth/verify-otp', { email, code }).then((r) => r.data),

  resendOtp: (email: string) =>
    api.post('/auth/resend-otp', { email }).then((r) => r.data),

  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),
};