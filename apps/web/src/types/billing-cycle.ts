export type BillingCycleStatus = "draft" | "open" | "closed" | "cancelled";

export type BillingCycle = {
  id: number;
  name: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  status: BillingCycleStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BillingCycleListResponse = {
  items: BillingCycle[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
};

export type BillingCycleListParams = {
  search?: string;
  status?: BillingCycleStatus | "";
  page?: number;
  limit?: number;
};

export type BillingCyclePayload = {
  name: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  status?: BillingCycleStatus;
  notes?: string | null;
};
