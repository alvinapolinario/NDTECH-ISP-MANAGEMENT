"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type AuthUser,
  clearAuthSession,
  getAccessToken,
  getStoredAuthUser,
  isSuperAdminUser,
  storeAuthUser,
} from "@/lib/auth-user";
import { apiRequest } from "@/lib/api";
import { withBasePath } from "@/lib/base-path";

export type { AuthRole, AuthUser, AuthSession } from "@/lib/auth-user";
export {
  clearAuthSession,
  clearAuthUser,
  getAccessToken,
  getStoredAuthUser,
  isAuthenticated,
  isSuperAdminUser,
  storeAuthSession,
  storeAuthUser,
} from "@/lib/auth-user";

export function useAuthUser() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const storedUser = getStoredAuthUser();
    if (storedUser) {
      setUser(storedUser);
      setReady(true);
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setReady(true);
      return;
    }

    try {
      const profile = await apiRequest<AuthUser>("/auth/me");
      storeAuthUser(profile);
      setUser(profile);
    } catch {
      clearAuthSession();
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function logout() {
    clearAuthSession();
    setUser(null);
    window.location.href = withBasePath("/login");
  }

  return {
    user,
    ready,
    isSuperAdmin: isSuperAdminUser(user),
    refresh,
    logout,
  };
}
