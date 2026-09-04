import { apiClient } from '../../../shared/api/client';
import type { UserDto } from '../../../shared/api/types';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponseData {
  user: UserDto;
}

export const authApi = {
  async register(input: RegisterInput): Promise<UserDto> {
    const data = await apiClient.post<AuthResponseData>('/auth/register', input);
    return data.user;
  },

  async login(input: LoginInput): Promise<UserDto> {
    const data = await apiClient.post<AuthResponseData>('/auth/login', input);
    return data.user;
  },

  async getCurrentUser(): Promise<UserDto> {
    const data = await apiClient.get<AuthResponseData>('/auth/me');
    return data.user;
  },

  async logout(): Promise<void> {
    await apiClient.post<void>('/auth/logout');
  },
};
