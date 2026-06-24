"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type {
  ListResponse,
  SupportUser,
  TechnicianAssignment,
  TechnicianAssignmentPayload,
  Ticket,
  TicketCategory,
  TicketPayload,
} from "@/types/support";

type ListParams = {
  search?: string;
  filter?: string;
  status?: string;
  priority?: string;
  page?: number;
  limit?: number;
};

function buildQuery(params: ListParams = {}) {
  const query = new URLSearchParams({ page: String(params.page ?? 1), limit: String(params.limit ?? 10) });
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && key !== "page" && key !== "limit") {
      query.set(key, String(value));
    }
  });
  return query.toString();
}

export async function fetchTicketCategories(params: ListParams = {}) {
  return apiRequest<ListResponse<TicketCategory>>(`/ticket-categories?${buildQuery(params)}`);
}

export async function fetchTickets(params: ListParams = {}) {
  return apiRequest<ListResponse<Ticket>>(`/tickets?${buildQuery(params)}`);
}

export async function createTicket(payload: TicketPayload) {
  return apiRequest<Ticket>("/tickets", { method: "POST", body: JSON.stringify(payload) });
}

export async function updateTicket(id: number, payload: TicketPayload) {
  return apiRequest<Ticket>(`/tickets/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export async function resolveTicket(id: number, resolution?: string) {
  return apiRequest<Ticket>(`/tickets/${id}/resolve`, { method: "POST", body: JSON.stringify({ resolution }) });
}

export async function closeTicket(id: number) {
  return apiRequest<Ticket>(`/tickets/${id}/close`, { method: "POST" });
}

export async function deleteTicket(id: number) {
  return apiRequest<Ticket>(`/tickets/${id}`, { method: "DELETE" });
}

export async function fetchTechnicianAssignments(params: ListParams = {}) {
  return apiRequest<ListResponse<TechnicianAssignment>>(`/technician-assignments?${buildQuery(params)}`);
}

export async function createTechnicianAssignment(payload: TechnicianAssignmentPayload) {
  return apiRequest<TechnicianAssignment>("/technician-assignments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateTechnicianAssignment(id: number, payload: Partial<TechnicianAssignmentPayload>) {
  return apiRequest<TechnicianAssignment>(`/technician-assignments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function runTechnicianAssignmentAction(id: number, action: "accept" | "start" | "complete" | "cancel", completionNotes?: string) {
  return apiRequest<TechnicianAssignment>(`/technician-assignments/${id}/${action}`, {
    method: "POST",
    body: action === "complete" ? JSON.stringify({ completionNotes }) : undefined,
  });
}

export async function deleteTechnicianAssignment(id: number) {
  return apiRequest<TechnicianAssignment>(`/technician-assignments/${id}`, { method: "DELETE" });
}

export async function fetchSupportUsers() {
  return apiRequest<ListResponse<SupportUser>>("/users?page=1&limit=200&filter=active");
}

export function useSupportList<T>(
  loader: (params: ListParams) => Promise<ListResponse<T>>,
  params: ListParams,
  errorMessage: string,
) {
  const [data, setData] = useState<ListResponse<T>>({ items: [], meta: { total: 0, page: 1, limit: 10 } });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await loader(params));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : errorMessage);
    } finally {
      setLoading(false);
    }
  }, [loader, errorMessage, JSON.stringify(params)]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
