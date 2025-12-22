import { getAccessToken } from '../auth/token';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;

export type UserRole = 'Admin' | 'YardManager' | 'YardJockey' | 'GateSecurity' | 'Driver' | 'ViewOnly' | 'Operator';

export type UserDto = {
  id: string;
  fullName: string;
  email: string;
  username: string;
  phone: string;
  role: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export type CreateUserDto = {
  fullName: string;
  email: string;
  username: string;
  phone: string;
  role: string;
  password: string;
};

export type UpdateUserDto = {
  fullName?: string;
  email?: string;
  username?: string;
  phone?: string;
  role?: string;
  password?: string;
};

export type UserStatusDto = {
  isActive: boolean;
};

export type PagedResult<T> = {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = API_BASE_URL ?? '';
  const token = getAccessToken();
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    let message: string | undefined;

    try {
      const parsed = JSON.parse(text) as { message?: string };
      message = parsed?.message;
    } catch {
      // ignore parse errors
    }

    throw new Error(message || text || `Request failed (${res.status})`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

function parseIntHeader(headers: Headers, key: string): number {
  const v = headers.get(key);
  const n = v ? Number.parseInt(v, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

export async function getUsers(params: {
  page: number;
  pageSize: number;
  search?: string;
  role?: string;
  isActive?: boolean | null;
}): Promise<PagedResult<UserDto>> {
  const qs = new URLSearchParams();
  qs.set('page', String(params.page));
  qs.set('pageSize', String(params.pageSize));

  if (params.search && params.search.trim()) qs.set('search', params.search.trim());
  if (params.role && params.role.trim()) qs.set('role', params.role.trim());
  if (params.isActive !== null && params.isActive !== undefined) qs.set('isActive', String(params.isActive));

  const base = API_BASE_URL ?? '';
  const token = getAccessToken();
  const res = await fetch(`${base}/api/users?${qs.toString()}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed (${res.status})`);
  }

  const items = (await res.json()) as UserDto[];

  return {
    items,
    totalCount: parseIntHeader(res.headers, 'X-Total-Count'),
    page: parseIntHeader(res.headers, 'X-Page') || params.page,
    pageSize: parseIntHeader(res.headers, 'X-Page-Size') || params.pageSize,
    totalPages: parseIntHeader(res.headers, 'X-Total-Pages'),
  };
}

export async function getUserById(id: string): Promise<UserDto> {
  return request<UserDto>(`/api/users/${id}`);
}

export async function createUser(payload: CreateUserDto): Promise<UserDto> {
  return request<UserDto>('/api/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateUser(id: string, payload: UpdateUserDto): Promise<UserDto> {
  return request<UserDto>(`/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function updateUserStatus(id: string, isActive: boolean): Promise<void> {
  await request<void>(`/api/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive } satisfies UserStatusDto),
  });
}

export async function deleteUser(id: string): Promise<void> {
  await request<void>(`/api/users/${id}`, {
    method: 'DELETE',
  });
}
