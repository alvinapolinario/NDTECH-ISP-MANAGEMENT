"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type {
  ApiAccessTokenListParams,
  ApiAccessTokenListResponse,
  CreateApiAccessTokenResponse,
} from "@/types/api-access-token";

function buildQuery(params: ApiAccessTokenListParams) {
  const search = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 20),
  });

  if (params.search) search.set("search", params.search);
  if (params.filter) search.set("filter", params.filter);
  if (params.userId) search.set("userId", String(params.userId));

  return search.toString();
}

export function useApiAccessTokens(params: ApiAccessTokenListParams) {
  const [data, setData] = useState<ApiAccessTokenListResponse>({
    items: [],
    meta: { total: 0, page: 1, limit: 20 },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await apiRequest<ApiAccessTokenListResponse>(
        `/api-access-tokens?${buildQuery(params)}`,
      );
      setData(response);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load tokens");
      setData({ items: [], meta: { total: 0, page: 1, limit: 20 } });
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

export async function createApiAccessToken(input: {
  userId: number;
  label?: string;
  deviceId?: string;
}) {
  return apiRequest<CreateApiAccessTokenResponse>("/api-access-tokens", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function revokeApiAccessToken(id: number) {
  return apiRequest(`/api-access-tokens/${id}/revoke`, {
    method: "POST",
  });
}
