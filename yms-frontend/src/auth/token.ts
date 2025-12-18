const STORAGE_KEY = 'yms_access_token';

const local = window.localStorage;
const session = window.sessionStorage;

export function getAccessToken(): string | null {
  return session.getItem(STORAGE_KEY) ?? local.getItem(STORAGE_KEY);
}

export function setAccessToken(token: string, remember: boolean): void {
  session.removeItem(STORAGE_KEY);
  local.removeItem(STORAGE_KEY);

  if (remember) {
    local.setItem(STORAGE_KEY, token);
  } else {
    session.setItem(STORAGE_KEY, token);
  }
}

export function clearAccessToken(): void {
  session.removeItem(STORAGE_KEY);
  local.removeItem(STORAGE_KEY);
}
