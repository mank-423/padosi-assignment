import React, { createContext, useContext, useEffect, useState } from 'react';
import { getToken, clearToken } from '../api/client';

type AuthCtx = {
  loading: boolean;
  isLoggedIn: boolean;
  signIn: () => void;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>(null as any);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    getToken().then((t) => {
      setIsLoggedIn(!!t);
      setLoading(false);
    });
  }, []);

  return (
    <Ctx.Provider
      value={{
        loading,
        isLoggedIn,
        signIn: () => setIsLoggedIn(true),
        signOut: async () => {
          await clearToken();
          setIsLoggedIn(false);
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);