import type { CustomerSummary } from "@/types/customer";
import type { InvoiceStatus } from "@/types/invoice";
import type { StaffUserSummary } from "@/types/staff";

export type PaymentMethod =
  | "cash"
  | "gcash"
  | "bank_transfer"
  | "check"
  | "card"
  | "other";

export type PaymentStatus = "posted" | "voided";

export type Payment = {
  id: number;
  paymentNumber: string;
  invoiceId: number;
  customerId: number;
  amount: string | number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string | null;
  receivedBy?: string | null;
  collectorUserId?: number | null;
  status: PaymentStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  invoice: {
    id: number;
    invoiceNumber: string;
    total: string | number;
    amountPaid: string | number;
    balance: string | number;
    status: InvoiceStatus;
    dueDate: string;
    billingCycle: {
      id: number;
      name: string;
    };
  };
  customer: CustomerSummary;
  collector?: StaffUserSummary | null;
};

export type PaymentListResponse = {
  items: Payment[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
};

export type PaymentListParams = {
  search?: string;
  status?: PaymentStatus | "";
  paymentMethod?: PaymentMethod | "";
  invoiceId?: number | "";
  customerId?: number | "";
  subscriptionId?: number | "";
  page?: number;
  limit?: number;
};

export type PaymentPayload = {
  invoiceId: number;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string | null;
  receivedBy?: string | null;
  collectorUserId?: number | null;
  notes?: string | null;
};
