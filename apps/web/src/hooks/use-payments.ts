"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type {
  Payment,
  PaymentListParams,
  PaymentListResponse,
  PaymentPayload,
  PaymentStatus,
} from "@/types/payment";

function buildQuery(params: PaymentListParams = {}) {
  const searchParams = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 10),
  });

  if (params.search) searchParams.set("search", params.search);
  if (params.status) searchParams.set("status", params.status);
  if (params.paymentMethod) searchParams.set("paymentMethod", params.paymentMethod);
  if (params.invoiceId) searchParams.set("invoiceId", String(params.invoiceId));
  if (params.customerId) searchParams.set("customerId", String(params.customerId));
  if (params.subscriptionId) {
    searchParams.set("subscriptionId", String(params.subscriptionId));
  }

  return searchParams.toString();
}

export async function fetchPayments(params: PaymentListParams = {}) {
  return apiRequest<PaymentListResponse>(`/payments?${buildQuery(params)}`);
}

export async function createPayment(payload: PaymentPayload) {
  return apiRequest<Payment>("/payments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updatePayment(
  id: number,
  payload: Partial<PaymentPayload> & { status?: PaymentStatus },
) {
  return apiRequest<Payment>(`/payments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function voidPayment(id: number) {
  return apiRequest<Payment>(`/payments/${id}/void`, { method: "POST" });
}

export async function deletePayment(id: number) {
  return apiRequest<Payment>(`/payments/${id}`, { method: "DELETE" });
}

export function usePayments(params: PaymentListParams) {
  const [data, setData] = useState<PaymentListResponse>({
    items: [],
    meta: { total: 0, page: 1, limit: 10 },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setData(await fetchPayments(params));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load payments");
    } finally {
      setLoading(false);
    }
  }, [
    params.page,
    params.limit,
    params.search,
    params.status,
    params.paymentMethod,
    params.invoiceId,
    params.customerId,
    params.subscriptionId,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
