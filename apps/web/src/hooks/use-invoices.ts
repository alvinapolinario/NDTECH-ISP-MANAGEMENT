"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type {
  Invoice,
  InvoiceItemType,
  InvoiceListParams,
  InvoiceListResponse,
  InvoiceStatus,
} from "@/types/invoice";

function buildQuery(params: InvoiceListParams = {}) {
  const searchParams = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 10),
  });

  if (params.search) searchParams.set("search", params.search);
  if (params.status) searchParams.set("status", params.status);
  if (params.billingCycleId) {
    searchParams.set("billingCycleId", String(params.billingCycleId));
  }
  if (params.customerId) searchParams.set("customerId", String(params.customerId));
  if (params.subscriptionId) {
    searchParams.set("subscriptionId", String(params.subscriptionId));
  }

  return searchParams.toString();
}

export async function fetchInvoices(params: InvoiceListParams = {}) {
  return apiRequest<InvoiceListResponse>(`/invoices?${buildQuery(params)}`);
}

export async function updateInvoice(
  id: number,
  payload: {
    status?: InvoiceStatus;
    notes?: string | null;
    assignedFinanceUserId?: number | null;
    items?: Array<{
      itemType: InvoiceItemType;
      description: string;
      quantity: number;
      unitPrice: number;
      servicePlanId?: number | null;
    }>;
  },
) {
  return apiRequest<Invoice>(`/invoices/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteInvoice(id: number) {
  return apiRequest<Invoice>(`/invoices/${id}`, { method: "DELETE" });
}

export async function generateInvoices(
  billingCycleId: number,
  status: InvoiceStatus = "issued",
) {
  return apiRequest<{
    billingCycleId: number;
    created: number;
    skipped: number;
    message: string;
  }>("/invoices/generate", {
    method: "POST",
    body: JSON.stringify({ billingCycleId, status }),
  });
}

export function useInvoices(params: InvoiceListParams) {
  const [data, setData] = useState<InvoiceListResponse>({
    items: [],
    meta: { total: 0, page: 1, limit: 10 },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setData(await fetchInvoices(params));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load invoices");
    } finally {
      setLoading(false);
    }
  }, [params.page, params.limit, params.search, params.status, params.billingCycleId, params.customerId, params.subscriptionId]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
