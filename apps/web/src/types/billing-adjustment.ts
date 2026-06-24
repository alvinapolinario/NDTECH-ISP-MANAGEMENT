import type { CustomerSummary } from "@/types/customer";
import type { InvoiceStatus } from "@/types/invoice";
import type { StaffUserSummary } from "@/types/staff";

export type BillingAdjustmentType = "credit" | "charge";
export type BillingAdjustmentStatus = "posted" | "voided";

export type BillingAdjustment = {
  id: number;
  adjustmentNumber: string;
  invoiceId: number;
  customerId: number;
  adjustmentType: BillingAdjustmentType;
  amount: string | number;
  reason: string;
  adjustmentDate: string;
  status: BillingAdjustmentStatus;
  notes?: string | null;
  assignedFinanceUserId?: number | null;
  createdAt: string;
  updatedAt: string;
  invoice: {
    id: number;
    invoiceNumber: string;
    subtotal: string | number;
    total: string | number;
    amountPaid: string | number;
    balance: string | number;
    status: InvoiceStatus;
    dueDate: string;
    billingCycle: { id: number; name: string };
  };
  customer: CustomerSummary;
  assignedFinanceUser?: StaffUserSummary | null;
};

export type BillingAdjustmentListResponse = {
  items: BillingAdjustment[];
  meta: { total: number; page: number; limit: number };
};

export type BillingAdjustmentListParams = {
  search?: string;
  status?: BillingAdjustmentStatus | "";
  adjustmentType?: BillingAdjustmentType | "";
  invoiceId?: number | "";
  customerId?: number | "";
  page?: number;
  limit?: number;
};

export type BillingAdjustmentPayload = {
  invoiceId: number;
  adjustmentType: BillingAdjustmentType;
  amount: number;
  reason: string;
  adjustmentDate: string;
  notes?: string | null;
  assignedFinanceUserId?: number | null;
};
