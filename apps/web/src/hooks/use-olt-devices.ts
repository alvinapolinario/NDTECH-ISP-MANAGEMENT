"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type {
  OltDevice,
  OltDeviceListParams,
  OltDeviceListResponse,
  OltDevicePayload,
} from "@/types/olt-device";

function buildQuery(params: OltDeviceListParams = {}) {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 10),
  });
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);
  if (params.ponTechnology) query.set("ponTechnology", params.ponTechnology);
  return query.toString();
}

export async function fetchOltDevices(params: OltDeviceListParams = {}) {
  return apiRequest<OltDeviceListResponse>(`/olt-devices?${buildQuery(params)}`);
}

export async function createOltDevice(payload: OltDevicePayload) {
  return apiRequest<OltDevice>("/olt-devices", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateOltDevice(id: number, payload: Partial<OltDevicePayload>) {
  return apiRequest<OltDevice>(`/olt-devices/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteOltDevice(id: number) {
  return apiRequest<OltDevice>(`/olt-devices/${id}`, { method: "DELETE" });
}

export async function testOltSnmp(id: number) {
  return apiRequest<{
    deviceId: number;
    success: boolean;
    latencyMs: number;
    sysDescr?: string | null;
    sysName?: string | null;
    sysUpTime?: number | null;
    error?: string;
  }>(`/olt-devices/${id}/test-snmp`, { method: "POST" });
}

export async function pollOltDevice(id: number) {
  return apiRequest<{
    deviceId: number;
    success: boolean;
    latencyMs: number;
    onuUpdated: number;
    onuReadings: Array<Record<string, unknown>>;
    error?: string;
  }>(`/olt-devices/${id}/poll`, { method: "POST" });
}

export function useOltDevices(params: OltDeviceListParams) {
  const [data, setData] = useState<OltDeviceListResponse>({
    items: [],
    meta: { total: 0, page: 1, limit: 10 },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchOltDevices(params));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load OLT devices");
    } finally {
      setLoading(false);
    }
  }, [params.page, params.limit, params.search, params.status, params.ponTechnology]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
