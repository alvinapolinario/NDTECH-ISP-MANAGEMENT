"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type {
  BillingAdjustment,
  BillingAdjustmentListParams,
  BillingAdjustmentListResponse,
  BillingAdjustmentPayload,
  BillingAdjustmentStatus,
} from "@/types/billing-adjustment";

function buildQuery(params: BillingAdjustmentListParams = {}) {
  const searchParams = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 10),
  });
  if (params.search) searchParams.set("search", params.search);
  if (params.status) searchParams.set("status", params.status);
  if (params.adjustmentType) searchParams.set("adjustmentType", params.adjustmentType);
  if (params.invoiceId) searchParams.set("invoiceId", String(params.invoiceId));
  if (params.customerId) searchParams.set("customerId", String(params.customerId));
  return searchParams.toString();
}

export async function fetchBillingAdjustments(params: BillingAdjustmentListParams = {}) {
  return apiRequest<BillingAdjustmentListResponse>(
    `/billing-adjustments?${buildQuery(params)}`,
  );
}

export async function createBillingAdjustment(payload: BillingAdjustmentPayload) {
  return apiRequest<BillingAdjustment>("/billing-adjustments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateBillingAdjustment(
  id: number,
  payload: Partial<BillingAdjustmentPayload> & { status?: BillingAdjustmentStatus },
) {
  return apiRequest<BillingAdjustment>(`/billing-adjustments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function voidBillingAdjustment(id: number) {
  return apiRequest<BillingAdjustment>(`/billing-adjustments/${id}/void`, {
    method: "POST",
  });
}

export async function deleteBillingAdjustment(id: number) {
  return apiRequest<BillingAdjustment>(`/billing-adjustments/${id}`, {
    method: "DELETE",
  });
}

export function useBillingAdjustments(params: BillingAdjustmentListParams) {
  const [data, setData] = useState<BillingAdjustmentListResponse>({
    items: [],
    meta: { total: 0, page: 1, limit: 10 },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchBillingAdjustments(params));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load adjustments");
    } finally {
      setLoading(false);
    }
  }, [params.page, params.limit, params.search, params.status, params.adjustmentType, params.invoiceId, params.customerId]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
