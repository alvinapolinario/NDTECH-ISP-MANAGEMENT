"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type {
  InstallationRequest,
  InstallationRequestListParams,
  InstallationRequestListResponse,
  InstallationRequestPayload,
} from "@/types/installation-request";

function buildQuery(params: InstallationRequestListParams = {}) {
  const searchParams = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 10),
  });

  if (params.search) searchParams.set("search", params.search);
  if (params.status) searchParams.set("status", params.status);
  if (params.priority) searchParams.set("priority", params.priority);

  return searchParams.toString();
}

export async function fetchInstallationRequests(
  params: InstallationRequestListParams = {},
) {
  return apiRequest<InstallationRequestListResponse>(
    `/installation-requests?${buildQuery(params)}`,
  );
}

export async function createInstallationRequest(
  payload: InstallationRequestPayload,
) {
  return apiRequest<InstallationRequest>("/installation-requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateInstallationRequest(
  id: number,
  payload: Partial<InstallationRequestPayload>,
) {
  return apiRequest<InstallationRequest>(`/installation-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteInstallationRequest(id: number) {
  return apiRequest<InstallationRequest>(`/installation-requests/${id}`, {
    method: "DELETE",
  });
}

export function useInstallationRequests(params: InstallationRequestListParams) {
  const [data, setData] = useState<InstallationRequestListResponse>({
    items: [],
    meta: { total: 0, page: 1, limit: 10 },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setData(await fetchInstallationRequests(params));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load installation requests",
      );
    } finally {
      setLoading(false);
    }
  }, [params.page, params.limit, params.search, params.status, params.priority]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
