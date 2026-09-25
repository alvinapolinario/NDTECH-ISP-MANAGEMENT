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
  label?: string | null;
  /** Negotiated monthly fee; null/undefined means use plan catalog price. */
  monthlyAmount?: string | number | null;
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
  radiusUsername: string;
  label: string;
  /** Empty string = use plan catalog price. */
  monthlyAmount: string;
  billingDay: string;
  startDate: string;
  endDate: string;
  status: SubscriptionStatus;
  autoSuspendEnabled: boolean;
  gracePeriodDays: string;
};

export type PppoeAccountOption = {
  username: string;
  groupname?: string | null;
  activeSessions?: number;
  lastStart?: string | null;
  pppoeAccountId: number | null;
  customerId: number | null;
  servicePlanId: number | null;
  linkedSubscriptionId: number | null;
  profileName?: string | null;
  router?: { id: number; name: string; host: string } | null;
  customer?: {
    id: number;
    accountNumber: string;
    firstName?: string | null;
    lastName?: string | null;
    businessName?: string | null;
  } | null;
  servicePlan?: { id: number; code: string; name: string } | null;
};

export type PppoeAccountOptionsResponse = {
  items: PppoeAccountOption[];
  source: "radius" | "local";
};

export type CreateSubscriptionPayload = {
  customerId: number;
  servicePlanId: number;
  pppoeAccountId?: number;
  radiusUsername?: string;
  label?: string;
  monthlyAmount?: number;
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
  radiusUsername?: string;
  label?: string | null;
  monthlyAmount?: number | null;
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
