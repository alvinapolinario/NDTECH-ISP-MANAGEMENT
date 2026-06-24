"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type {
  CollectionCase,
  CollectionCaseListParams,
  CollectionCaseListResponse,
  CollectionCasePayload,
} from "@/types/collection";

function buildQuery(params: CollectionCaseListParams = {}) {
  const searchParams = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 10),
  });
  if (params.search) searchParams.set("search", params.search);
  if (params.status) searchParams.set("status", params.status);
  if (params.priority) searchParams.set("priority", params.priority);
  if (params.invoiceId) searchParams.set("invoiceId", String(params.invoiceId));
  if (params.customerId) searchParams.set("customerId", String(params.customerId));
  return searchParams.toString();
}

export async function fetchCollectionCases(params: CollectionCaseListParams = {}) {
  return apiRequest<CollectionCaseListResponse>(`/collections?${buildQuery(params)}`);
}

export async function createCollectionCase(payload: CollectionCasePayload) {
  return apiRequest<CollectionCase>("/collections", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateCollectionCase(
  id: number,
  payload: Partial<CollectionCasePayload>,
) {
  return apiRequest<CollectionCase>(`/collections/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteCollectionCase(id: number) {
  return apiRequest<CollectionCase>(`/collections/${id}`, { method: "DELETE" });
}

export async function importOverdueCollections() {
  return apiRequest<{
    scanned: number;
    created: number;
    restored: number;
    skipped: number;
    message: string;
  }>("/collections/import-overdue", { method: "POST" });
}

export function useCollectionCases(params: CollectionCaseListParams) {
  const [data, setData] = useState<CollectionCaseListResponse>({
    items: [],
    meta: { total: 0, page: 1, limit: 10 },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchCollectionCases(params));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load collections");
    } finally {
      setLoading(false);
    }
  }, [params.page, params.limit, params.search, params.status, params.priority, params.invoiceId, params.customerId]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
