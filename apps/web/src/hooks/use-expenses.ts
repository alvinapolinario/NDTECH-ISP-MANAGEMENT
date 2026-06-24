"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type {
  Expense,
  ExpenseCategory,
  ExpenseCategoryPayload,
  ExpenseListParams,
  ExpenseListResponse,
  ExpensePayload,
  ExpenseStatus,
} from "@/types/expense";
import type { PaymentMethod } from "@/types/payment";

type ListResponse<T> = {
  items: T[];
  meta: { total: number; page: number; limit: number };
};

function buildExpenseQuery(params: ExpenseListParams = {}) {
  const searchParams = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 10),
  });

  if (params.search) searchParams.set("search", params.search);
  if (params.status) searchParams.set("status", params.status);
  if (params.paymentMethod) searchParams.set("paymentMethod", params.paymentMethod);
  if (params.expenseCategoryId) {
    searchParams.set("expenseCategoryId", String(params.expenseCategoryId));
  }

  return searchParams.toString();
}

export async function fetchExpenses(params: ExpenseListParams = {}) {
  return apiRequest<ExpenseListResponse>(`/expenses?${buildExpenseQuery(params)}`);
}

export async function createExpense(payload: ExpensePayload) {
  return apiRequest<Expense>("/expenses", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateExpense(
  id: number,
  payload: Partial<ExpensePayload> & { status?: ExpenseStatus },
) {
  return apiRequest<Expense>(`/expenses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function voidExpense(id: number) {
  return apiRequest<Expense>(`/expenses/${id}/void`, { method: "POST" });
}

export async function deleteExpense(id: number) {
  return apiRequest<Expense>(`/expenses/${id}`, { method: "DELETE" });
}

export function useExpenses(params: ExpenseListParams) {
  const [data, setData] = useState<ExpenseListResponse>({
    items: [],
    meta: { total: 0, page: 1, limit: 10 },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setData(await fetchExpenses(params));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load expenses");
    } finally {
      setLoading(false);
    }
  }, [
    params.page,
    params.limit,
    params.search,
    params.status,
    params.paymentMethod,
    params.expenseCategoryId,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

export async function fetchExpenseCategories(params: {
  search?: string;
  filter?: string;
  limit?: number;
} = {}) {
  const query = new URLSearchParams({
    page: "1",
    limit: String(params.limit ?? 100),
  });
  if (params.search) query.set("search", params.search);
  if (params.filter) query.set("filter", params.filter);

  return apiRequest<ListResponse<ExpenseCategory>>(`/expense-categories?${query.toString()}`);
}

export async function createExpenseCategory(payload: ExpenseCategoryPayload) {
  return apiRequest<ExpenseCategory>("/expense-categories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateExpenseCategory(
  id: number,
  payload: Partial<ExpenseCategoryPayload>,
) {
  return apiRequest<ExpenseCategory>(`/expense-categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteExpenseCategory(id: number) {
  return apiRequest<ExpenseCategory>(`/expense-categories/${id}`, {
    method: "DELETE",
  });
}
