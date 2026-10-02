import { api } from './client';

export type Profile = {
  name: string;
  mobile: string;
  address: string;
  businessName?: string;
};

export const profileApi = {
  get: () => api.get('/profile').then((r) => r.data),

  save: (profile: Profile) =>
    api.put('/profile', profile).then((r) => r.data),
};