"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { CustomerDocument, CustomerListResponse } from "@/types/customer";

export async function fetchCustomers(search = "", limit = 100, filter = "") {
  const params = new URLSearchParams({
    page: "1",
    limit: String(limit),
  });

  if (search) params.set("search", search);
  if (filter) params.set("filter", filter);

  return apiRequest<CustomerListResponse>(`/customers?${params.toString()}`);
}

export async function fetchCustomerDocuments(params: { search?: string; page?: number; limit?: number } = {}) {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 10),
  });
  if (params.search) query.set("search", params.search);
  return apiRequest<{ items: CustomerDocument[]; meta: { total: number; page: number; limit: number } }>(
    `/customer-documents?${query.toString()}`,
  );
}

export async function createCustomerDocument(payload: {
  customerId: number;
  documentType: string;
  filePath: string;
  uploadedByUserId?: number;
}) {
  return apiRequest<CustomerDocument>("/customer-documents", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteCustomerDocument(id: number) {
  return apiRequest<CustomerDocument>(`/customer-documents/${id}`, { method: "DELETE" });
}

export function useCustomers(search = "") {
  const [customers, setCustomers] = useState<CustomerListResponse["items"]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetchCustomers(search);
      setCustomers(response.items);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to load customers",
      );
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  return { customers, loading, error, reload: load };
}
