import axios from 'axios';
import { api } from './client';

export type ProfileInput = {
  name: string;
  mobile: string;
  address: string;
  businessName?: string;
};

// Fields can be null when the server returns an empty profile
export type Profile = {
  userId?: string;
  name: string | null;
  mobile: string | null;
  address: string | null;
  businessName?: string | null;
  completedAt?: string | null;
};

type ProfileResponse = { profile: Profile | null };

// A profile only counts once the required fields are actually filled in.
// This also covers a server that returns an object full of nulls.
export const isProfileComplete = (p?: Profile | null) =>
  !!p && !!p.name?.trim() && !!p.mobile?.trim() && !!p.address?.trim();

export const profileApi = {
  get: async (): Promise<ProfileResponse> => {
    try {
      const r = await api.get<ProfileResponse>('/profile');
      return { profile: r.data?.profile ?? null };
    } catch (e) {
      // "no profile yet" is a normal state, not an error
      if (axios.isAxiosError(e) && e.response?.status === 404) return { profile: null };
      throw e;
    }
  },

  save: (profile: ProfileInput) =>
    api.put<ProfileResponse>('/profile', profile).then((r) => r.data),
};