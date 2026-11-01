"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type {
  OnuDevice,
  OnuDeviceListParams,
  OnuDeviceListResponse,
  OnuDevicePayload,
} from "@/types/onu-device";

function buildQuery(params: OnuDeviceListParams = {}) {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 10),
  });
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);
  if (params.oltDeviceId) query.set("oltDeviceId", String(params.oltDeviceId));
  if (params.customerId) query.set("customerId", String(params.customerId));
  if (params.subscriptionId) query.set("subscriptionId", String(params.subscriptionId));
  return query.toString();
}

export async function fetchOnuDevices(params: OnuDeviceListParams = {}) {
  return apiRequest<OnuDeviceListResponse>(`/onu-devices?${buildQuery(params)}`);
}

export async function createOnuDevice(payload: OnuDevicePayload) {
  return apiRequest<OnuDevice>("/onu-devices", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateOnuDevice(id: number, payload: Partial<OnuDevicePayload>) {
  return apiRequest<OnuDevice>(`/onu-devices/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteOnuDevice(id: number) {
  return apiRequest<OnuDevice>(`/onu-devices/${id}`, { method: "DELETE" });
}

export async function pollOnuDevice(id: number) {
  return apiRequest<{
    onuDeviceId: number;
    oltDeviceId: number;
    onu: OnuDevice;
    oltPoll: { success: boolean; onuUpdated: number; error?: string };
  }>(`/onu-devices/${id}/poll`, { method: "POST" });
}

export function useOnuDevices(params: OnuDeviceListParams) {
  const [data, setData] = useState<OnuDeviceListResponse>({
    items: [],
    meta: { total: 0, page: 1, limit: 10 },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchOnuDevices(params));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load ONU devices");
    } finally {
      setLoading(false);
    }
  }, [
    params.page,
    params.limit,
    params.search,
    params.status,
    params.oltDeviceId,
    params.customerId,
    params.subscriptionId,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
