import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config';

// 45s timeout: a free Render instance can take 30s+ to wake up.
export const api = axios.create({ baseURL: API_URL, timeout: 45000 });

// Attach the JWT to every request automatically
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global 401 handling: if a request that carried a token is rejected,
// the session is expired/invalid, so sign the user out.
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn;
};

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401 && err?.config?.headers?.Authorization) {
      onUnauthorized?.();
    }
    return Promise.reject(err);
  }
);

// Human-readable message from our backend's error shape
export function getErrorMessage(err: any): string {
  if (axios.isAxiosError(err)) {
    if (err.response?.data?.message) return err.response.data.message;
    if (err.code === 'ECONNABORTED') {
      return 'The server is taking too long to respond. It may be waking up, so try again in a moment.';
    }
    if (!err.response) {
      return "Can't reach the server. Check your connection and try again.";
    }
  }
  return 'Something went wrong. Try again.';
}

// Machine-readable code, e.g. EMAIL_TAKEN, EMAIL_NOT_VERIFIED
export function getErrorCode(err: any): string | undefined {
  return axios.isAxiosError(err) ? err.response?.data?.error : undefined;
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export async function saveToken(token: string) {
  await SecureStore.setItemAsync('token', token);
}

export async function clearToken() {
  await SecureStore.deleteItemAsync('token');
}

export async function getToken() {
  return SecureStore.getItemAsync('token');
}