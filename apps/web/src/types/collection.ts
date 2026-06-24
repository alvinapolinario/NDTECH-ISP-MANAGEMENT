import type { CustomerSummary } from "@/types/customer";
import type { InvoiceStatus } from "@/types/invoice";
import type { StaffUserSummary } from "@/types/staff";

export type CollectionCaseStatus =
  | "pending"
  | "contacted"
  | "promised_to_pay"
  | "escalated"
  | "resolved"
  | "cancelled";

export type CollectionPriority = "low" | "normal" | "high" | "urgent";

export type CollectionCase = {
  id: number;
  invoiceId: number;
  customerId: number;
  status: CollectionCaseStatus;
  priority: CollectionPriority;
  assignedCollector?: string | null;
  assignedCollectorUserId?: number | null;
  assignedFinanceUserId?: number | null;
  lastContactedAt?: string | null;
  nextFollowUpDate?: string | null;
  promiseToPayDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  invoice: {
    id: number;
    invoiceNumber: string;
    dueDate: string;
    total: string | number;
    amountPaid: string | number;
    balance: string | number;
    status: InvoiceStatus;
    billingCycle: { id: number; name: string };
  };
  customer: CustomerSummary;
  assignedCollectorUser?: StaffUserSummary | null;
  assignedFinanceUser?: StaffUserSummary | null;
};

export type CollectionCaseListResponse = {
  items: CollectionCase[];
  meta: { total: number; page: number; limit: number };
};

export type CollectionCaseListParams = {
  search?: string;
  status?: CollectionCaseStatus | "";
  priority?: CollectionPriority | "";
  invoiceId?: number | "";
  customerId?: number | "";
  page?: number;
  limit?: number;
};

export type CollectionCasePayload = {
  invoiceId: number;
  status?: CollectionCaseStatus;
  priority?: CollectionPriority;
  assignedCollector?: string | null;
  assignedCollectorUserId?: number | null;
  assignedFinanceUserId?: number | null;
  lastContactedAt?: string | null;
  nextFollowUpDate?: string | null;
  promiseToPayDate?: string | null;
  notes?: string | null;
};
