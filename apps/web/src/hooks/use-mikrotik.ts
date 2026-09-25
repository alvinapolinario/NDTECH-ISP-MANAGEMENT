"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type {
  ListResponse,
  MikrotikRouter,
  PppoeAccount,
  PppoeSession,
  PppoeOnlineSummary,
  PppoeSessionMonitoring,
} from "@/types/mikrotik";

export async function fetchMikrotikRouters(params: {
  search?: string;
  filter?: string;
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 10),
  });
  if (params.search) query.set("search", params.search);
  if (params.filter) query.set("filter", params.filter);
  return apiRequest<ListResponse<MikrotikRouter>>(
    `/mikrotik-routers?${query.toString()}`,
  );
}

export async function testMikrotikConnection(id: number) {
  return apiRequest<{ ok: boolean; message: string }>(
    `/mikrotik-routers/${id}/test-connection`,
    { method: "POST" },
  );
}

export type PppoeAccountActionLog = {
  id: number;
  pppoeAccountId: number;
  action: "enable" | "disable" | "suspend" | "restore" | "profile_change";
  triggerSource: string;
  previousStatus: string | null;
  newStatus: string | null;
  previousProfile: string | null;
  newProfile: string | null;
  mikrotikMessage: string | null;
  notes: string | null;
  createdAt: string;
  performedBy: { id: number; name: string; email: string } | null;
  invoice: { id: number; invoiceNumber: string } | null;
  payment: { id: number; paymentNumber: string } | null;
};

export async function fetchPppoeActionLogs(accountId: number) {
  return apiRequest<{ items: PppoeAccountActionLog[] }>(
    `/pppoe-accounts/${accountId}/action-logs`,
  );
}

export async function fetchPppoeProfiles(routerId: number) {
  return apiRequest<{ items: Array<{ name: string }> }>(
    `/mikrotik-routers/${routerId}/ppp-profiles`,
  );
}

export async function syncPppoeAccounts(id: number) {
  return apiRequest<{
    routerId: number;
    fetched: number;
    updated: number;
    imported: number;
    skipped: number;
    message: string;
  }>(`/mikrotik-routers/${id}/sync-pppoe-accounts`, { method: "POST" });
}

export async function createMikrotikRouter(body: Record<string, unknown>) {
  return apiRequest<MikrotikRouter>("/mikrotik-routers", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateMikrotikRouter(
  id: number,
  body: Record<string, unknown>,
) {
  return apiRequest<MikrotikRouter>(`/mikrotik-routers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteMikrotikRouter(id: number) {
  return apiRequest<MikrotikRouter>(`/mikrotik-routers/${id}`, {
    method: "DELETE",
  });
}

export async function fetchPppoeAccounts(params: {
  search?: string;
  status?: string;
  routerId?: number | "";
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 10),
  });
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);
  if (params.routerId) query.set("routerId", String(params.routerId));
  return apiRequest<ListResponse<PppoeAccount>>(
    `/pppoe-accounts?${query.toString()}`,
  );
}

export async function createPppoeAccount(body: Record<string, unknown>) {
  return apiRequest<PppoeAccount>("/pppoe-accounts", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updatePppoeAccount(
  id: number,
  body: Record<string, unknown>,
) {
  return apiRequest<PppoeAccount>(`/pppoe-accounts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function linkPppoeAccountToSubscription(
  id: number,
  subscriptionId: number,
) {
  return apiRequest<PppoeAccount>(`/pppoe-accounts/${id}/link-subscription`, {
    method: "POST",
    body: JSON.stringify({ subscriptionId }),
  });
}

export async function deletePppoeAccount(id: number) {
  return apiRequest<PppoeAccount>(`/pppoe-accounts/${id}`, {
    method: "DELETE",
  });
}

export async function runPppoeAction(
  id: number,
  action: "enable" | "disable" | "suspend",
) {
  return apiRequest<PppoeAccount>(`/pppoe-accounts/${id}/${action}`, {
    method: "POST",
  });
}

export async function fetchPppoeSessionSummary() {
  return apiRequest<PppoeOnlineSummary>("/pppoe-sessions/summary");
}

export async function fetchPppoeSessionMonitoring(routerId: number) {
  return apiRequest<PppoeSessionMonitoring>(
    `/pppoe-sessions/monitoring?routerId=${routerId}`,
  );
}

export async function fetchPppoeSessions(params: {
  routerId?: number | "";
  search?: string;
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 10),
  });
  if (params.search) query.set("search", params.search);
  if (params.routerId) query.set("routerId", String(params.routerId));
  return apiRequest<ListResponse<PppoeSession>>(
    `/pppoe-sessions?${query.toString()}`,
  );
}

export async function refreshPppoeSessions(routerId: number) {
  return apiRequest<{ routerId: number; sessions: number }>(
    `/pppoe-sessions/refresh/${routerId}`,
    { method: "POST" },
  );
}

export function useMikrotikRouters(params: {
  search?: string;
  filter?: string;
  page?: number;
}) {
  const [data, setData] = useState<ListResponse<MikrotikRouter>>({
    items: [],
    meta: { total: 0, page: 1, limit: 10 },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchMikrotikRouters(params));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load routers");
    } finally {
      setLoading(false);
    }
  }, [params.page, params.search, params.filter]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
