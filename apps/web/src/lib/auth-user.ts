export type AuthRole = {
  id: number;
  name: string;
};

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  mobileNumber?: string | null;
  status: string;
  roles: AuthRole[];
};

export type AuthSession = {
  accessToken: string;
  user: AuthUser;
};

const AUTH_USER_KEY = "isp_auth_user";
const AUTH_TOKEN_COOKIE = "isp_access_token";
const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24;

export function getStoredAuthUser(): AuthUser | null {
  if (typeof window === "undefined") return null;

  const raw = sessionStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie.match(
    new RegExp(`(?:^|; )${AUTH_TOKEN_COOKIE}=([^;]*)`),
  );

  return match ? decodeURIComponent(match[1]) : null;
}

export function isAuthenticated() {
  return Boolean(getAccessToken() && getStoredAuthUser());
}

export function storeAuthSession(session: AuthSession) {
  sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(session.user));
  document.cookie = `${AUTH_TOKEN_COOKIE}=${encodeURIComponent(session.accessToken)}; path=/; max-age=${TOKEN_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function storeAuthUser(user: AuthUser) {
  sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  sessionStorage.removeItem(AUTH_USER_KEY);
  document.cookie = `${AUTH_TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export function clearAuthUser() {
  clearAuthSession();
}

export function isSuperAdminUser(user: AuthUser | null) {
  return user?.roles?.some((role) => role.name === "Super Admin") ?? false;
}
