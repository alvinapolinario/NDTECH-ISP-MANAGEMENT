"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { StaffUser } from "@/types/staff";

type StaffListResponse = {
  items: StaffUser[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
};

export async function fetchStaffByRole(role: string) {
  const params = new URLSearchParams({
    role,
    limit: "500",
    page: "1",
  });

  const response = await apiRequest<StaffListResponse>(`/users?${params.toString()}`);
  return response.items.filter((user) => user.status === "active");
}

export function useStaffByRole(role: string) {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setStaff(await fetchStaffByRole(role));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load staff");
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    load();
  }, [load]);

  return { staff, loading, error, reload: load };
}
