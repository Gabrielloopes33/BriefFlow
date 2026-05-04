const SESSION_TOKEN_KEY = "bf_session_token";
const SESSION_EXPIRES_AT_KEY = "bf_session_expires_at";
const TENANT_ID_KEY = "bf_tenant_id";
const USER_CACHE_KEY = "bf_user_cache";

export interface AuthSessionPayload {
  token: string;
  expiresAt: string;
  tenantId: string;
  user: Record<string, unknown>;
}

function parseTimestamp(value: string | null): number {
  if (!value) return 0;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : 0;
}

export function saveAuthSession(payload: AuthSessionPayload): void {
  localStorage.setItem(SESSION_TOKEN_KEY, payload.token);
  localStorage.setItem(SESSION_EXPIRES_AT_KEY, payload.expiresAt);
  localStorage.setItem(TENANT_ID_KEY, payload.tenantId);
  localStorage.setItem(USER_CACHE_KEY, JSON.stringify(payload.user));
}

export function getSessionToken(): string | null {
  const token = localStorage.getItem(SESSION_TOKEN_KEY);
  if (!token) return null;

  const expiresAt = parseTimestamp(localStorage.getItem(SESSION_EXPIRES_AT_KEY));
  if (!expiresAt || Date.now() >= expiresAt) {
    clearAuthSession();
    return null;
  }

  return token;
}

export function getTenantId(): string | null {
  const tenantId = localStorage.getItem(TENANT_ID_KEY);
  return tenantId && tenantId.trim().length > 0 ? tenantId : null;
}

export function setTenantId(tenantId: string): void {
  localStorage.setItem(TENANT_ID_KEY, tenantId);
}

export function getCachedUser<T = Record<string, unknown>>(): T | null {
  const raw = localStorage.getItem(USER_CACHE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setCachedUser(user: unknown): void {
  localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
}

export function clearAuthSession(): void {
  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(SESSION_EXPIRES_AT_KEY);
  localStorage.removeItem(TENANT_ID_KEY);
  localStorage.removeItem(USER_CACHE_KEY);
}
