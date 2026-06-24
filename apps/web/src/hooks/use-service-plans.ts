"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { ServicePlanListResponse } from "@/types/service-plan";

export async function fetchServicePlans(limit = 100) {
  const params = new URLSearchParams({
    page: "1",
    limit: String(limit),
    filter: "active",
  });

  return apiRequest<ServicePlanListResponse>(
    `/service-plans?${params.toString()}`,
  );
}

export function useServicePlans() {
  const [plans, setPlans] = useState<ServicePlanListResponse["items"]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetchServicePlans();
      setPlans(response.items);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to load service plans",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { plans, loading, error, reload: load };
}
