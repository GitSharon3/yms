import { getAccessToken } from '../auth/token';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;

export async function http<T>(path: string, init?: RequestInit): Promise<T> {
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
