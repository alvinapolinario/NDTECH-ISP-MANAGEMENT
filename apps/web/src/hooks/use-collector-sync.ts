"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type {
  CollectorDaySummary,
  CollectorDaySummaryParams,
  CollectorPaymentUploadListParams,
  CollectorPaymentUploadListResponse,
  CollectorPaymentUploadSummary,
  CollectorSyncEventListParams,
  CollectorSyncEventListResponse,
} from "@/types/collector-sync";

function buildPaymentUploadsQuery(params: CollectorPaymentUploadListParams = {}) {
  const searchParams = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 20),
  });

  if (params.collectorUserId) {
    searchParams.set("collectorUserId", String(params.collectorUserId));
  }
  if (params.resultStatus) searchParams.set("resultStatus", params.resultStatus);
  if (params.from) searchParams.set("from", params.from);
  if (params.to) searchParams.set("to", params.to);

  return searchParams.toString();
}

function buildEventsQuery(params: CollectorSyncEventListParams = {}) {
  const searchParams = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 20),
  });

  if (params.collectorUserId) {
    searchParams.set("collectorUserId", String(params.collectorUserId));
  }
  if (params.eventType) searchParams.set("eventType", params.eventType);
  if (params.resultStatus) searchParams.set("resultStatus", params.resultStatus);
  if (params.from) searchParams.set("from", params.from);
  if (params.to) searchParams.set("to", params.to);

  return searchParams.toString();
}

function buildSummaryQuery(params: CollectorDaySummaryParams = {}) {
  const searchParams = new URLSearchParams();
  if (params.date) searchParams.set("date", params.date);
  if (params.collectorUserId) {
    searchParams.set("collectorUserId", String(params.collectorUserId));
  }
  return searchParams.toString();
}

export async function fetchCollectorPaymentUploads(
  params: CollectorPaymentUploadListParams = {},
) {
  return apiRequest<CollectorPaymentUploadListResponse>(
    `/collector-sync/payment-uploads?${buildPaymentUploadsQuery(params)}`,
  );
}

export async function fetchCollectorPaymentUploadSummary(
  params: CollectorPaymentUploadListParams = {},
) {
  return apiRequest<CollectorPaymentUploadSummary>(
    `/collector-sync/payment-uploads/summary?${buildPaymentUploadsQuery(params)}`,
  );
}

export async function fetchCollectorSyncEvents(
  params: CollectorSyncEventListParams = {},
) {
  return apiRequest<CollectorSyncEventListResponse>(
    `/collector-sync/events?${buildEventsQuery(params)}`,
  );
}

export async function fetchCollectorDaySummary(params: CollectorDaySummaryParams = {}) {
  const query = buildSummaryQuery(params);
  return apiRequest<CollectorDaySummary>(
    `/collector-sync/day-summary${query ? `?${query}` : ""}`,
  );
}

export function useCollectorSyncEvents(params: CollectorSyncEventListParams) {
  const [data, setData] = useState<CollectorSyncEventListResponse>({
    items: [],
    meta: { total: 0, page: 1, limit: 20 },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchCollectorSyncEvents(params));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to load sync events",
      );
    } finally {
      setLoading(false);
    }
  }, [
    params.page,
    params.limit,
    params.collectorUserId,
    params.eventType,
    params.resultStatus,
    params.from,
    params.to,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

export function useCollectorPaymentUploads(params: CollectorPaymentUploadListParams) {
  const [data, setData] = useState<CollectorPaymentUploadListResponse>({
    items: [],
    meta: { total: 0, page: 1, limit: 20 },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchCollectorPaymentUploads(params));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to load payment uploads",
      );
    } finally {
      setLoading(false);
    }
  }, [
    params.page,
    params.limit,
    params.collectorUserId,
    params.resultStatus,
    params.from,
    params.to,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

export function useCollectorPaymentUploadSummary(
  params: CollectorPaymentUploadListParams,
) {
  const [data, setData] = useState<CollectorPaymentUploadSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchCollectorPaymentUploadSummary(params));
    } catch (caught) {
      setData(null);
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load payment upload summary",
      );
    } finally {
      setLoading(false);
    }
  }, [params.collectorUserId, params.resultStatus, params.from, params.to]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

export function useCollectorDaySummary(params: CollectorDaySummaryParams) {
  const [data, setData] = useState<CollectorDaySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchCollectorDaySummary(params));
    } catch (caught) {
      setData(null);
      setError(
        caught instanceof Error ? caught.message : "Unable to load day summary",
      );
    } finally {
      setLoading(false);
    }
  }, [params.date, params.collectorUserId]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
