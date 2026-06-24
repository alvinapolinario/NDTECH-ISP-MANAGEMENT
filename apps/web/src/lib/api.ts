import { clearAuthSession, getAccessToken, getStoredAuthUser } from "@/lib/auth-user";
import { ApiRequestError, readApiErrorMessage } from "@/lib/api-errors";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "/backend";

function getAuthHeaders() {
  const headers: Record<string, string> = {};
  const token = getAccessToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  const user = getStoredAuthUser();
  if (user) {
    headers["X-User-Id"] = String(user.id);
  }

  return headers;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...(options.headers ?? {}),
    },
    cache: "no-store",
  });

  if (response.status === 401 && typeof window !== "undefined") {
    clearAuthSession();
    const next = encodeURIComponent(window.location.pathname);
    window.location.href = `/login?next=${next}`;
    throw new Error("Session expired. Please sign in again.");
  }

  if (!response.ok) {
    const message = await readApiErrorMessage(response);
    throw new ApiRequestError(message, response.status);
  }

  return response.json() as Promise<T>;
}

export async function loginRequest(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await readApiErrorMessage(response);
    throw new ApiRequestError(message, response.status);
  }

  return response.json() as Promise<{
    accessToken: string;
    user: {
      id: number;
      name: string;
      email: string;
      status: string;
      roles: Array<{ id: number; name: string }>;
    };
  }>;
}
