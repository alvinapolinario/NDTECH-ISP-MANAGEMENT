"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type {
  GoodsReceipt,
  GoodsReceiptListResponse,
  GoodsReceiptPayload,
  PurchaseOrder,
  PurchaseOrderListResponse,
  PurchaseOrderPayload,
  PurchaseRequest,
  PurchaseRequestListResponse,
  PurchaseRequestPayload,
} from "@/types/procurement";
import type { ListResponse } from "@/types/inventory";
import type { Supplier } from "@/types/procurement";

type ListParams = {
  search?: string;
  status?: string;
  priority?: string;
  page?: number;
  limit?: number;
};

function buildQuery(params: ListParams = {}) {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 10),
  });
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && key !== "page" && key !== "limit") {
      query.set(key, String(value));
    }
  });
  return query.toString();
}

export async function fetchSuppliers(params: { search?: string; filter?: string; limit?: number } = {}) {
  const query = new URLSearchParams({ page: "1", limit: String(params.limit ?? 100) });
  if (params.search) query.set("search", params.search);
  if (params.filter) query.set("filter", params.filter);
  return apiRequest<ListResponse<Supplier>>(`/suppliers?${query.toString()}`);
}

export async function fetchPurchaseRequests(params: ListParams = {}) {
  return apiRequest<PurchaseRequestListResponse>(`/purchase-requests?${buildQuery(params)}`);
}

export async function createPurchaseRequest(payload: PurchaseRequestPayload) {
  return apiRequest<PurchaseRequest>("/purchase-requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updatePurchaseRequest(id: number, payload: PurchaseRequestPayload) {
  return apiRequest<PurchaseRequest>(`/purchase-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function approvePurchaseRequest(id: number) {
  return apiRequest<PurchaseRequest>(`/purchase-requests/${id}/approve`, { method: "POST" });
}

export async function rejectPurchaseRequest(id: number, reason?: string) {
  return apiRequest<PurchaseRequest>(`/purchase-requests/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function deletePurchaseRequest(id: number) {
  return apiRequest<PurchaseRequest>(`/purchase-requests/${id}`, { method: "DELETE" });
}

export async function fetchPurchaseOrders(params: ListParams = {}) {
  return apiRequest<PurchaseOrderListResponse>(`/purchase-orders?${buildQuery(params)}`);
}

export async function fetchPurchaseOrder(id: number) {
  return apiRequest<PurchaseOrder>(`/purchase-orders/${id}`);
}

export async function createPurchaseOrder(payload: PurchaseOrderPayload) {
  return apiRequest<PurchaseOrder>("/purchase-orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updatePurchaseOrder(id: number, payload: PurchaseOrderPayload) {
  return apiRequest<PurchaseOrder>(`/purchase-orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function issuePurchaseOrder(id: number) {
  return apiRequest<PurchaseOrder>(`/purchase-orders/${id}/issue`, { method: "POST" });
}

export async function cancelPurchaseOrder(id: number, reason?: string) {
  return apiRequest<PurchaseOrder>(`/purchase-orders/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function deletePurchaseOrder(id: number) {
  return apiRequest<PurchaseOrder>(`/purchase-orders/${id}`, { method: "DELETE" });
}

export async function fetchGoodsReceipts(params: ListParams = {}) {
  return apiRequest<GoodsReceiptListResponse>(`/goods-receipts?${buildQuery(params)}`);
}

export async function createGoodsReceipt(payload: GoodsReceiptPayload) {
  return apiRequest<GoodsReceipt>("/goods-receipts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function usePurchaseRequests(params: ListParams) {
  const [data, setData] = useState<PurchaseRequestListResponse>({
    items: [],
    meta: { total: 0, page: 1, limit: 10 },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchPurchaseRequests(params));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load purchase requests");
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

export function usePurchaseOrders(params: ListParams) {
  const [data, setData] = useState<PurchaseOrderListResponse>({
    items: [],
    meta: { total: 0, page: 1, limit: 10 },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchPurchaseOrders(params));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load purchase orders");
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

export function useGoodsReceipts(params: ListParams) {
  const [data, setData] = useState<GoodsReceiptListResponse>({
    items: [],
    meta: { total: 0, page: 1, limit: 10 },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchGoodsReceipts(params));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load goods receipts");
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
