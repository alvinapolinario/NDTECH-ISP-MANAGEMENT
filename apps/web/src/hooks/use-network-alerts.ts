"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type {
  NetworkAlert,
  NetworkAlertListParams,
  NetworkAlertListResponse,
  NetworkAlertPayload,
} from "@/types/network-alert";

function buildQuery(params: NetworkAlertListParams = {}) {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 10),
  });
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);
  if (params.severity) query.set("severity", params.severity);
  return query.toString();
}

export async function fetchNetworkAlerts(params: NetworkAlertListParams = {}) {
  return apiRequest<NetworkAlertListResponse>(`/network-alerts?${buildQuery(params)}`);
}

export async function createNetworkAlert(payload: NetworkAlertPayload) {
  return apiRequest<NetworkAlert>("/network-alerts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateNetworkAlert(id: number, payload: Partial<NetworkAlertPayload>) {
  return apiRequest<NetworkAlert>(`/network-alerts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function acknowledgeNetworkAlert(id: number, acknowledgedBy = "Operations") {
  return apiRequest<NetworkAlert>(`/network-alerts/${id}/acknowledge`, {
    method: "POST",
    body: JSON.stringify({ acknowledgedBy }),
  });
}

export async function resolveNetworkAlert(
  id: number,
  payload: { resolvedBy?: string; resolution?: string } = {},
) {
  return apiRequest<NetworkAlert>(`/network-alerts/${id}/resolve`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteNetworkAlert(id: number) {
  return apiRequest<NetworkAlert>(`/network-alerts/${id}`, { method: "DELETE" });
}

export function useNetworkAlerts(params: NetworkAlertListParams) {
  const [data, setData] = useState<NetworkAlertListResponse>({
    items: [],
    meta: { total: 0, page: 1, limit: 10 },
    summary: {
      total: 0,
      open: 0,
      acknowledged: 0,
      resolved: 0,
      dismissed: 0,
      severity: { info: 0, warning: 0, critical: 0 },
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchNetworkAlerts(params));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load network alerts");
    } finally {
      setLoading(false);
    }
  }, [params.page, params.limit, params.search, params.status, params.severity]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
