"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type {
  NetworkMonitoringCheck,
  NetworkMonitoringCheckPayload,
  NetworkMonitoringListParams,
  NetworkMonitoringListResponse,
  NetworkMonitoringTarget,
  NetworkMonitoringTargetPayload,
} from "@/types/network-monitoring";

function buildQuery(params: NetworkMonitoringListParams = {}) {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 10),
  });
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);
  if (params.deviceType) query.set("deviceType", params.deviceType);
  return query.toString();
}

export async function fetchNetworkMonitoringTargets(params: NetworkMonitoringListParams = {}) {
  return apiRequest<NetworkMonitoringListResponse>(`/network-monitoring?${buildQuery(params)}`);
}

export async function createNetworkMonitoringTarget(payload: NetworkMonitoringTargetPayload) {
  return apiRequest<NetworkMonitoringTarget>("/network-monitoring", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateNetworkMonitoringTarget(
  id: number,
  payload: Partial<NetworkMonitoringTargetPayload>,
) {
  return apiRequest<NetworkMonitoringTarget>(`/network-monitoring/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteNetworkMonitoringTarget(id: number) {
  return apiRequest<NetworkMonitoringTarget>(`/network-monitoring/${id}`, { method: "DELETE" });
}

export async function recordNetworkMonitoringCheck(
  id: number,
  payload: NetworkMonitoringCheckPayload,
) {
  return apiRequest<{ check: NetworkMonitoringCheck; target: NetworkMonitoringTarget }>(
    `/network-monitoring/${id}/checks`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function useNetworkMonitoringTargets(params: NetworkMonitoringListParams) {
  const [data, setData] = useState<NetworkMonitoringListResponse>({
    items: [],
    meta: { total: 0, page: 1, limit: 10 },
    summary: { total: 0, online: 0, degraded: 0, offline: 0, unknown: 0 },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchNetworkMonitoringTargets(params));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load monitoring targets");
    } finally {
      setLoading(false);
    }
  }, [params.page, params.limit, params.search, params.status, params.deviceType]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
