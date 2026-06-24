"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type {
  InventoryAdjustment,
  InventoryItem,
  InventoryMovement,
  InventoryMovementType,
  InventoryAdjustmentType,
  ListResponse,
  InventoryCategory,
  Warehouse,
} from "@/types/inventory";

type ListParams = {
  search?: string;
  filter?: string;
  page?: number;
  limit?: number;
  [key: string]: string | number | undefined;
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

export async function fetchInventoryCategories(params: ListParams = {}) {
  return apiRequest<ListResponse<InventoryCategory>>(`/inventory-categories?${buildQuery(params)}`);
}

export async function fetchWarehouses(params: ListParams = {}) {
  return apiRequest<ListResponse<Warehouse>>(`/warehouses?${buildQuery(params)}`);
}

export async function fetchInventoryItems(params: ListParams = {}) {
  return apiRequest<ListResponse<InventoryItem>>(`/inventory-items?${buildQuery(params)}`);
}

export async function createInventoryItem(payload: Record<string, unknown>) {
  return apiRequest<InventoryItem>("/inventory-items", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateInventoryItem(id: number, payload: Record<string, unknown>) {
  return apiRequest<InventoryItem>(`/inventory-items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteInventoryItem(id: number) {
  return apiRequest<InventoryItem>(`/inventory-items/${id}`, { method: "DELETE" });
}

export async function fetchInventoryMovements(params: ListParams = {}) {
  return apiRequest<ListResponse<InventoryMovement>>(`/inventory-movements?${buildQuery(params)}`);
}

export async function createInventoryMovement(payload: {
  itemId: number;
  warehouseId: number;
  toWarehouseId?: number | null;
  movementType: InventoryMovementType;
  quantity: number;
  unitCost?: number | null;
  referenceType?: string | null;
  referenceNo?: string | null;
  notes?: string | null;
}) {
  return apiRequest<InventoryMovement>("/inventory-movements", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchInventoryAdjustments(params: ListParams = {}) {
  return apiRequest<ListResponse<InventoryAdjustment>>(`/inventory-adjustments?${buildQuery(params)}`);
}

export async function createInventoryAdjustment(payload: {
  itemId: number;
  warehouseId: number;
  adjustmentType: InventoryAdjustmentType;
  quantity: number;
  reason: string;
  notes?: string | null;
}) {
  return apiRequest<InventoryAdjustment>("/inventory-adjustments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function useInventoryList<T>(
  loader: (params: ListParams) => Promise<ListResponse<T>>,
  params: ListParams,
  errorMessage: string,
) {
  const [data, setData] = useState<ListResponse<T>>({
    items: [],
    meta: { total: 0, page: 1, limit: 10 },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await loader(params));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : errorMessage);
    } finally {
      setLoading(false);
    }
  }, [loader, errorMessage, JSON.stringify(params)]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
