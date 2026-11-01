import type { BillingCycle } from "@/types/billing-cycle";
import type { CustomerSummary } from "@/types/customer";
import type { StaffUserSummary } from "@/types/staff";

export type InvoiceStatus =
  | "draft"
  | "issued"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled";

export type InvoiceItemType =
  | "recurring_service"
  | "installation_fee"
  | "adjustment"
  | "repair"
  | "connector"
  | "previous_balance"
  | "other";

export type InvoiceItem = {
  id: number;
  invoiceId: number;
  servicePlanId?: number | null;
  itemType: InvoiceItemType;
  description: string;
  quantity: string | number;
  unitPrice: string | number;
  amount: string | number;
};

export type Invoice = {
  id: number;
  invoiceNumber: string;
  billingCycleId: number;
  customerId: number;
  subscriptionId?: number | null;
  issueDate: string;
  dueDate: string;
  subtotal: string | number;
  total: string | number;
  amountPaid: string | number;
  balance: string | number;
  status: InvoiceStatus;
  notes?: string | null;
  assignedFinanceUserId?: number | null;
  createdAt: string;
  updatedAt: string;
  billingCycle: BillingCycle;
  customer: CustomerSummary;
  subscription?: {
    id: number;
    billingDay: number;
    status: string;
    monthlyAmount?: string | number | null;
    servicePlan: {
      id: number;
      code: string;
      name: string;
      monthlyPrice: string | number;
    };
  } | null;
  items: InvoiceItem[];
  assignedFinanceUser?: StaffUserSummary | null;
};

export type InvoiceListResponse = {
  items: Invoice[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
};

export type InvoiceListParams = {
  search?: string;
  status?: InvoiceStatus | "";
  billingCycleId?: number | "";
  customerId?: number | "";
  subscriptionId?: number | "";
  page?: number;
  limit?: number;
};
