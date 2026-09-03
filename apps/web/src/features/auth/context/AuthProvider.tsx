import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { UserDto } from '../../../shared/api/types';
import { authApi, type LoginInput, type RegisterInput } from '../api/auth.api';
import { AuthContext, type AuthContextValue } from './AuthContext';

export interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<UserDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const currentUser = await authApi.getCurrentUser();
        if (isMounted) {
          setUser(currentUser);
        }
      } catch {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (input: LoginInput): Promise<void> => {
    const loggedInUser = await authApi.login(input);
    setUser(loggedInUser);
  }, []);

  const register = useCallback(async (input: RegisterInput): Promise<void> => {
    const registeredUser = await authApi.register(input);
    setUser(registeredUser);
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value: AuthContextValue = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      login,
      register,
      logout,
    }),
    [user, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
