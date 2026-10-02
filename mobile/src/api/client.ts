import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config';

export const api = axios.create({ baseURL: API_URL });

// Attach the JWT to every request automatically
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Extract a clean error message from our backend's shape
export function getErrorMessage(err: any): string {
  if (axios.isAxiosError(err) && err.response?.data?.message) {
    return err.response.data.message;
  }
  return 'Something went wrong. Try again.';
}

export async function saveToken(token: string) {
  await SecureStore.setItemAsync('token', token);
}

export async function clearToken() {
  await SecureStore.deleteItemAsync('token');
}

export async function getToken() {
  return SecureStore.getItemAsync('token');
}