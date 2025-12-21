import { http } from './http';

export type UserDto = {
  id: string;
  email: string;
  username: string;
  role: string;
};

export type LoginRequest = {
  identifier: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  expiresAtUtc: string;
  user: UserDto;
};

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  return http<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function me(): Promise<UserDto> {
  return http<UserDto>('/api/auth/me');
}
