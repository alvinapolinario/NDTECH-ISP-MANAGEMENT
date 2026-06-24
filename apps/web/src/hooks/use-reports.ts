import { apiRequest } from "@/lib/api";
import type { ReportResponse } from "@/types/report";

export type ReportQuery = {
  search?: string;
  filter?: string;
  page?: number;
  limit?: number;
  month?: string;
  year?: string;
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
