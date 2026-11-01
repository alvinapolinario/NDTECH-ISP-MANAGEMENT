"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type {
  SwitchDevice,
  SwitchDeviceListParams,
  SwitchDeviceListResponse,
  SwitchDevicePayload,
} from "@/types/switch-device";

function buildQuery(params: SwitchDeviceListParams = {}) {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 10),
  });
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);
  if (params.vendor) query.set("vendor", params.vendor);
  return query.toString();
}

export async function fetchSwitchDevices(params: SwitchDeviceListParams = {}) {
  return apiRequest<SwitchDeviceListResponse>(`/switch-devices?${buildQuery(params)}`);
}

export async function createSwitchDevice(payload: SwitchDevicePayload) {
  return apiRequest<SwitchDevice>("/switch-devices", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateSwitchDevice(id: number, payload: Partial<SwitchDevicePayload>) {
  return apiRequest<SwitchDevice>(`/switch-devices/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteSwitchDevice(id: number) {
  return apiRequest<SwitchDevice>(`/switch-devices/${id}`, { method: "DELETE" });
}

export async function testSwitchSnmp(id: number) {
  return apiRequest<{
    deviceId: number;
    success: boolean;
    latencyMs: number;
    sysDescr?: string | null;
    sysName?: string | null;
    error?: string;
  }>(`/switch-devices/${id}/test-snmp`, { method: "POST" });
}

export async function pollSwitchDevice(id: number) {
  return apiRequest<{
    deviceId: number;
    success: boolean;
    latencyMs: number;
    interfaces?: { total: number; up: number; down: number; errors: number };
    error?: string;
  }>(`/switch-devices/${id}/poll`, { method: "POST" });
}

export function useSwitchDevices(params: SwitchDeviceListParams) {
  const [data, setData] = useState<SwitchDeviceListResponse>({
    items: [],
    meta: { total: 0, page: 1, limit: 10 },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchSwitchDevices(params));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load switches");
    } finally {
      setLoading(false);
    }
  }, [params.page, params.limit, params.search, params.status, params.vendor]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
