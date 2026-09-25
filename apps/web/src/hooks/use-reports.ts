import { apiRequest } from "@/lib/api";
import type { ReportResponse } from "@/types/report";

export type ReportQuery = {
  search?: string;
  filter?: string;
  page?: number;
  limit?: number;
  month?: string;
  year?: string;
  from?: string;
  to?: string;
  collectorUserId?: number | "";
};

function buildQuery(params: ReportQuery = {}) {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 10),
  });
  if (params.search) query.set("search", params.search);
  if (params.filter) query.set("filter", params.filter);
  if (params.month) query.set("month", params.month);
  if (params.year) query.set("year", params.year);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.collectorUserId) {
    query.set("collectorUserId", String(params.collectorUserId));
  }
  return query.toString();
}

export function fetchSubscriberReport(params?: ReportQuery) {
  return apiRequest<ReportResponse<Record<string, unknown>>>(
    `/reports/subscribers?${buildQuery(params)}`,
  );
}

export function fetchBillingReport(params?: ReportQuery) {
  return apiRequest<ReportResponse<Record<string, unknown>>>(
    `/reports/billing?${buildQuery(params)}`,
  );
}

export function fetchCollectionReport(params?: ReportQuery) {
  return apiRequest<ReportResponse<Record<string, unknown>>>(
    `/reports/collections?${buildQuery(params)}`,
  );
}

export function fetchCollectionByCollectorReport(params?: ReportQuery) {
  return apiRequest<
    ReportResponse<Record<string, unknown>> & {
      period?: { from: string; to: string };
    }
  >(`/reports/collections/by-collector?${buildQuery(params)}`);
}

export function fetchReferralReport(params?: ReportQuery) {
  return apiRequest<ReportResponse<Record<string, unknown>>>(
    `/reports/referrals?${buildQuery(params)}`,
  );
}

export function fetchNetworkReport(params?: ReportQuery) {
  return apiRequest<ReportResponse<Record<string, unknown>>>(
    `/reports/network?${buildQuery(params)}`,
  );
}

export function fetchInventoryReport(params?: ReportQuery) {
  return apiRequest<ReportResponse<Record<string, unknown>>>(
    `/reports/inventory?${buildQuery(params)}`,
  );
}

export function fetchProjectReport(params?: ReportQuery) {
  return apiRequest<ReportResponse<Record<string, unknown>>>(
    `/reports/projects?${buildQuery(params)}`,
  );
}
