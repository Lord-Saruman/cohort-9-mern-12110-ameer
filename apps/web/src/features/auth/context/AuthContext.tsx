import { createContext, useContext } from 'react';
import type { UserDto } from '../../../shared/api/types';
import type { LoginInput, RegisterInput } from '../api/auth.api';

export interface AuthContextValue {
  user: UserDto | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
