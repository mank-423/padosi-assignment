import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import {
  clearToken,
  getErrorMessage,
  getToken,
  setUnauthorizedHandler,
} from '../api/client';
import { isProfileComplete, profileApi } from '../api/profile';

// loading      -> checking SecureStore + asking the server about the profile
// bootError    -> token exists but the profile check failed (see bootMessage)
// signedOut    -> no valid session
// needsProfile -> logged in, first-login profile not yet saved
// ready        -> logged in with a complete profile
type Status = 'loading' | 'bootError' | 'signedOut' | 'needsProfile' | 'ready';

type AuthCtx = {
  status: Status;
  bootMessage: string;
  signIn: () => Promise<void>; // call after the token has been saved
  profileCompleted: () => void;
  signOut: () => Promise<void>;
  retryBoot: () => void;
};

const Ctx = createContext<AuthCtx>(null as any);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [bootMessage, setBootMessage] = useState('');
  const qc = useQueryClient();

  const signOut = useCallback(async () => {
    await clearToken();
    qc.clear(); // don't leak one user's cached data to the next login
    setBootMessage('');
    setStatus('signedOut');
  }, [qc]);

  // Ask the server whether this user still needs the first-login profile
  const checkProfile = useCallback(async () => {
    try {
      const { profile } = await profileApi.get();
      qc.setQueryData(['profile'], { profile });
      setStatus(isProfileComplete(profile) ? 'ready' : 'needsProfile');
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 401) {
        await signOut();
      } else {
        const code = axios.isAxiosError(e) ? e.response?.status : undefined;
        console.log(
          'BOOT ERROR',
          axios.isAxiosError(e) ? [e.code, e.response?.status, e.response?.data] : e
        );
        setBootMessage(getErrorMessage(e) + (code ? ` (HTTP ${code})` : ''));
        setStatus('bootError');
      }
    }
  }, [qc, signOut]);

  const boot = useCallback(async () => {
    setStatus('loading');
    const token = await getToken();
    if (!token) return setStatus('signedOut');
    await checkProfile();
  }, [checkProfile]);

  useEffect(() => {
    setUnauthorizedHandler(signOut);
    boot();
  }, [signOut, boot]);

  return (
    <Ctx.Provider
      value={{
        status,
        bootMessage,
        signOut,
        retryBoot: boot,
        signIn: checkProfile,
        profileCompleted: () => setStatus('ready'),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);