"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type {
  CreateSubscriptionPayload,
  PppoeAccountOptionsResponse,
  Subscription,
  SubscriptionListParams,
  SubscriptionListResponse,
  UpdateSubscriptionPayload,
} from "@/types/subscription";

function buildQuery(params: SubscriptionListParams = {}) {
  const searchParams = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 10),
  });

  if (params.search) searchParams.set("search", params.search);
  if (params.status) searchParams.set("status", params.status);
  if (params.servicePlanId) {
    searchParams.set("servicePlanId", String(params.servicePlanId));
  }

  return searchParams.toString();
}

export async function fetchSubscriptions(params: SubscriptionListParams = {}) {
  return apiRequest<SubscriptionListResponse>(
    `/subscriptions?${buildQuery(params)}`,
  );
}

export async function fetchSubscription(id: number | string) {
  return apiRequest<Subscription>(`/subscriptions/${id}`);
}

export async function fetchPppoeAccountOptions(params: {
  customerId?: number | string;
  servicePlanId?: number | string;
  excludeSubscriptionId?: number | string;
  search?: string;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params.customerId) query.set("customerId", String(params.customerId));
  if (params.servicePlanId) {
    query.set("servicePlanId", String(params.servicePlanId));
  }
  if (params.excludeSubscriptionId) {
    query.set("excludeSubscriptionId", String(params.excludeSubscriptionId));
  }
  if (params.search) query.set("search", params.search);
  query.set("limit", String(params.limit ?? 100));
  return apiRequest<PppoeAccountOptionsResponse>(
    `/subscriptions/pppoe-account-options?${query.toString()}`,
  );
}

export async function createSubscription(payload: CreateSubscriptionPayload) {
  return apiRequest<Subscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateSubscription(
  id: number | string,
  payload: UpdateSubscriptionPayload,
) {
  return apiRequest<Subscription>(`/subscriptions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteSubscription(id: number | string) {
  return apiRequest<Subscription>(`/subscriptions/${id}`, {
    method: "DELETE",
  });
}

export function useSubscriptions(params: SubscriptionListParams) {
  const [data, setData] = useState<SubscriptionListResponse>({
    items: [],
    meta: { total: 0, page: 1, limit: 10 },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setData(await fetchSubscriptions(params));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to load subscriptions",
      );
    } finally {
      setLoading(false);
    }
  }, [params.page, params.limit, params.search, params.status, params.servicePlanId]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

export function useSubscription(id?: string) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError("");

    try {
      setSubscription(await fetchSubscription(id));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to load subscription",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return { subscription, loading, error, reload: load };
}
