import { clearAuthSession, getAccessToken, getStoredAuthUser } from "@/lib/auth-user";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

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
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
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
    let message = "Invalid email or password";
    try {
      const body = await response.json();
      message = body.message ?? message;
      if (Array.isArray(message)) {
        message = message.join(", ");
      }
    } catch {
      const text = await response.text();
      if (text) message = text;
    }
    throw new Error(message);
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
