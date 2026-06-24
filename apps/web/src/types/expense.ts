import type { PaymentMethod } from "@/types/payment";

export type ExpenseStatus = "recorded" | "voided";

export type ExpenseCategory = {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
};

export type Expense = {
  id: number;
  expenseNumber: string;
  expenseCategoryId: number;
  supplierId: number | null;
  expenseDate: string;
  amount: string;
  payee: string;
  paymentMethod: PaymentMethod;
  referenceNumber: string | null;
  description: string;
  notes: string | null;
  status: ExpenseStatus;
  recordedByUserId: number | null;
  assignedFinanceUserId: number | null;
  category: ExpenseCategory;
  supplier: {
    id: number;
    code: string;
    name: string;
  } | null;
  recordedBy: {
    id: number;
    name: string;
    email: string;
  } | null;
  assignedFinanceUser: {
    id: number;
    name: string;
    email: string;
  } | null;
};

export type ExpenseListParams = {
  search?: string;
  status?: ExpenseStatus | "";
  paymentMethod?: PaymentMethod | "";
  expenseCategoryId?: number | "";
  page?: number;
  limit?: number;
};

export type ExpenseListResponse = {
  items: Expense[];
  meta: { total: number; page: number; limit: number };
};

export type ExpensePayload = {
  expenseCategoryId: number;
  supplierId?: number | null;
  expenseDate: string;
  amount: number;
  payee: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string | null;
  description: string;
  notes?: string | null;
  recordedByUserId?: number | null;
  assignedFinanceUserId?: number | null;
};

export type ExpenseCategoryPayload = {
  name: string;
  description?: string | null;
  isActive?: boolean;
};
