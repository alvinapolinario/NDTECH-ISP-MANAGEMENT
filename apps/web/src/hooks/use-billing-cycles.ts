"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type {
  BillingCycle,
  BillingCycleListParams,
  BillingCycleListResponse,
  BillingCyclePayload,
} from "@/types/billing-cycle";

function buildQuery(params: BillingCycleListParams = {}) {
  const searchParams = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 10),
  });

  if (params.search) searchParams.set("search", params.search);
  if (params.status) searchParams.set("status", params.status);

  return searchParams.toString();
}

export async function fetchBillingCycles(params: BillingCycleListParams = {}) {
  return apiRequest<BillingCycleListResponse>(
    `/billing-cycles?${buildQuery(params)}`,
  );
}

export async function createBillingCycle(payload: BillingCyclePayload) {
  return apiRequest<BillingCycle>("/billing-cycles", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateBillingCycle(
  id: number,
  payload: Partial<BillingCyclePayload>,
) {
  return apiRequest<BillingCycle>(`/billing-cycles/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteBillingCycle(id: number) {
  return apiRequest<BillingCycle>(`/billing-cycles/${id}`, {
    method: "DELETE",
  });
}

export function useBillingCycles(params: BillingCycleListParams) {
  const [data, setData] = useState<BillingCycleListResponse>({
    items: [],
    meta: { total: 0, page: 1, limit: 10 },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setData(await fetchBillingCycles(params));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load billing cycles");
    } finally {
      setLoading(false);
    }
  }, [params.page, params.limit, params.search, params.status]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
