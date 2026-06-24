import type { CustomerSummary } from "@/types/customer";
import type { ServicePlanSummary } from "@/types/service-plan";

export type SubscriptionStatus =
  | "active"
  | "suspended"
  | "cancelled"
  | "terminated";

export type Subscription = {
  id: number;
  customerId: number;
  servicePlanId: number;
  pppoeAccountId?: number | null;
  billingDay: number;
  startDate: string;
  endDate?: string | null;
  status: SubscriptionStatus;
  autoSuspendEnabled: boolean;
  gracePeriodDays: number;
  createdAt: string;
  updatedAt: string;
  customer: CustomerSummary;
  servicePlan: ServicePlanSummary;
  pppoeAccount?: {
    id: number;
    username: string;
    profileName: string;
    remoteAddress?: string | null;
    status: string;
    router: {
      id: number;
      name: string;
      host: string;
    };
  } | null;
};

export type SubscriptionListResponse = {
  items: Subscription[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
};

export type SubscriptionFormValues = {
  customerId: string;
  servicePlanId: string;
  pppoeAccountId: string;
  billingDay: string;
  startDate: string;
  endDate: string;
  status: SubscriptionStatus;
  autoSuspendEnabled: boolean;
  gracePeriodDays: string;
};

export type CreateSubscriptionPayload = {
  customerId: number;
  servicePlanId: number;
  pppoeAccountId?: number;
  billingDay: number;
  startDate: string;
  endDate?: string;
  status?: SubscriptionStatus;
  autoSuspendEnabled?: boolean;
  gracePeriodDays?: number;
};

export type UpdateSubscriptionPayload = {
  customerId?: number;
  servicePlanId?: number;
  pppoeAccountId?: number | null;
  billingDay?: number;
  startDate?: string;
  endDate?: string | null;
  status?: SubscriptionStatus;
  autoSuspendEnabled?: boolean;
  gracePeriodDays?: number;
};

export type SubscriptionListParams = {
  search?: string;
  status?: SubscriptionStatus | "";
  servicePlanId?: number | "";
  page?: number;
  limit?: number;
};
