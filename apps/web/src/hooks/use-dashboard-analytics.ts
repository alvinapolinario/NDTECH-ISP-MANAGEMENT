"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

export type DashboardMetrics = {
  totalActiveClients: number;
  clientsWithOverdue: number;
  collectedAmount: string;
  totalCollectable: string;
  totalUncollected: string;
  onlineClients: number;
  offlineClients: number;
};

export type DashboardRevenuePoint = {
  billingCycleId: number;
  label: string;
  periodStart: string;
  periodEnd: string;
  collectable: string;
  collected: string;
  uncollected: string;
};

export type DashboardTopBandwidthClient = {
  rank: number;
  username: string;
  customerName: string;
  barangay: string;
  uploadBytes: string;
  downloadBytes: string;
  totalBytes: string;
};

export type DashboardAnalytics = {
  billingCycle: {
    id: number;
    name: string;
    periodStart: string;
    periodEnd: string;
    dueDate: string;
    status: string;
  } | null;
  metrics: DashboardMetrics;
  onlinePppoeSummary: {
    totalOnline: number;
    routers: Array<{
      id: number;
      name: string;
      host: string;
      onlineCount: number;
      lastRefreshedAt: string | null;
    }>;
    generatedAt: string;
  };
  topBandwidthClients: DashboardTopBandwidthClient[];
  revenueSeries: DashboardRevenuePoint[];
  generatedAt: string;
};

export async function fetchDashboardAnalytics(billingCycleId?: number) {
  const params = new URLSearchParams();
  if (billingCycleId) {
    params.set("billingCycleId", String(billingCycleId));
  }

  const query = params.toString();
  return apiRequest<DashboardAnalytics>(
    `/dashboard/analytics${query ? `?${query}` : ""}`,
  );
}

export function useDashboardAnalytics(billingCycleId?: number) {
  const [data, setData] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setData(await fetchDashboardAnalytics(billingCycleId));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to load dashboard analytics",
      );
    } finally {
      setLoading(false);
    }
  }, [billingCycleId]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
