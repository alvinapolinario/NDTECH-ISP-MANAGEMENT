import { clearAuthSession, getAccessToken, getStoredAuthUser } from "@/lib/auth-user";
import { ApiRequestError, readApiErrorMessage } from "@/lib/api-errors";
import { withBasePath } from "@/lib/base-path";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? withBasePath("/backend");

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

function normalizeApiPath(path: string) {
  const [pathname, ...queryParts] = path.split("?");
  const query = queryParts.join("?");
  const normalizedPathname = pathname.replace(/\/+$/, "") || "/";
  return query ? `${normalizedPathname}?${query}` : normalizedPathname;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const apiPath = normalizeApiPath(path);

  const response = await fetch(`${API_BASE_URL}${apiPath}`, {
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
    window.location.href = withBasePath(`/login?next=${next}`);
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
