import { http } from './http';

export type AdminDto = {
  id: string;
  email: string;
  username: string;
};

export type LoginRequest = {
  identifier: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  expiresAtUtc: string;
  admin: AdminDto;
};

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  return http<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function me(): Promise<AdminDto> {
  return http<AdminDto>('/api/auth/me');
}
