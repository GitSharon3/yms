import { getAccessToken } from '../auth/token';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;

function stripHtml(input: string) {
  return input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function sanitizeErrorText(text: string, status: number) {
  const raw = stripHtml(text);
  const firstLine = raw.split(/\r?\n/).map((l) => l.trim()).find(Boolean);
  const candidate = firstLine ?? raw;

  // If it's an ASP.NET exception dump, keep just the exception type + message.
  const aspNetMatch = candidate.match(/^(?<type>[A-Za-z0-9_.]+Exception)\s*:\s*(?<msg>.*)$/);
  if (aspNetMatch?.groups?.msg) {
    return aspNetMatch.groups.msg.trim();
  }

  // Trim common stacktrace separators.
  const atIndex = candidate.indexOf(' at ');
  const trimmed = atIndex > 0 ? candidate.slice(0, atIndex).trim() : candidate;

  if (!trimmed) return `Request failed (${status})`;
  return trimmed.length > 240 ? `${trimmed.slice(0, 240)}…` : trimmed;
}

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
      const parsed = JSON.parse(text) as { message?: string; title?: string; detail?: string };
      message = parsed?.message || parsed?.detail || parsed?.title;
    } catch {
      // ignore parse errors
    }

    throw new Error(message || sanitizeErrorText(text, res.status));
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}
