"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type AuthUser,
  clearAuthSession,
  getStoredAuthUser,
  isSuperAdminUser,
} from "@/lib/auth-user";

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

  const refresh = useCallback(() => {
    setUser(getStoredAuthUser());
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function logout() {
    clearAuthSession();
    setUser(null);
    window.location.href = "/login";
  }

  return {
    user,
    ready,
    isSuperAdmin: isSuperAdminUser(user),
    refresh,
    logout,
  };
}
