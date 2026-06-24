import type { StaffUserSummary } from "@/types/staff";

export type CollectorMobileEventType = "payment" | "collection_update" | "visit_note";

export type CollectorMobileEventStatus =
  | "accepted"
  | "rejected"
  | "duplicate"
  | "adjusted";

export type CollectorSyncEvent = {
  id: number;
  localId: string;
  deviceId: string;
  eventType: CollectorMobileEventType;
  eventPayload: Record<string, unknown>;
  resultStatus: CollectorMobileEventStatus;
  resultMessage?: string | null;
  paymentId?: number | null;
  collectionCaseId?: number | null;
  processedAt: string;
  collector: StaffUserSummary;
  payment?: {
    id: number;
    paymentNumber: string;
    amount: number;
    paymentDate: string;
    invoiceId: number;
  } | null;
  collectionCase?: {
    id: number;
    invoiceId: number;
    customerId: number;
    status: string;
  } | null;
};

export type CollectorSyncEventListResponse = {
  items: CollectorSyncEvent[];
  meta: { total: number; page: number; limit: number };
};

export type CollectorSyncEventListParams = {
  page?: number;
  limit?: number;
  collectorUserId?: number | "";
  eventType?: CollectorMobileEventType | "";
  resultStatus?: CollectorMobileEventStatus | "";
  from?: string;
  to?: string;
};

export type CollectorDaySummary = {
  date: string;
  collector: StaffUserSummary;
  collections: {
    paymentCount: number;
    totalCollected: number;
    payments: Array<{
      id: number;
      paymentNumber: string;
      invoiceId: number;
      amount: number;
      paymentMethod: string;
    }>;
  };
  sync: {
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  };
};

export type CollectorDaySummaryParams = {
  date?: string;
  collectorUserId?: number | "";
};

export type CollectorPaymentUpload = {
  id: number;
  localId: string;
  deviceId: string;
  processedAt: string;
  resultStatus: CollectorMobileEventStatus;
  resultMessage?: string | null;
  collector: StaffUserSummary;
  uploadedAmount: number;
  paymentMethod: string;
  paymentDate: string;
  localReceiptNumber?: string | null;
  invoiceId: number;
  invoiceNumber?: string | null;
  customerName?: string | null;
  customerAccountNumber?: string | null;
  payment?: {
    id: number;
    paymentNumber: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
  } | null;
};

export type CollectorPaymentUploadListResponse = {
  items: CollectorPaymentUpload[];
  meta: { total: number; page: number; limit: number };
};

export type CollectorPaymentUploadListParams = {
  page?: number;
  limit?: number;
  collectorUserId?: number | "";
  resultStatus?: CollectorMobileEventStatus | "";
  from?: string;
  to?: string;
};

export type CollectorPaymentUploadSummary = {
  totalUploads: number;
  totalUploaded: number;
  totalPosted: number;
  byStatus: Record<string, number>;
};
