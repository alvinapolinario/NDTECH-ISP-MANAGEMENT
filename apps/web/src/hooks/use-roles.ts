"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

export type Role = {
  id: number;
  name: string;
  description?: string | null;
};

type RoleListResponse = {
  items: Role[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
};

export async function fetchRoles() {
  const response = await apiRequest<RoleListResponse>("/roles?limit=100");
  return response.items;
}

export function useRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setRoles(await fetchRoles());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load roles");
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { roles, loading, error, reload: load };
}
