export type SubscriptionPppoeOption = {
  username: string;
  groupname: string | null;
  activeSessions: number;
  lastStart?: string | null;
  pppoeAccountId: number | null;
  customerId: number | null;
  servicePlanId: number | null;
  linkedSubscriptionId: number | null;
  profileName: string | null;
  router: {
    id: number;
    name: string;
    host: string;
  } | null;
  customer: {
    id: number;
    accountNumber: string;
    firstName?: string | null;
    lastName?: string | null;
    businessName?: string | null;
  } | null;
  servicePlan: {
    id: number;
    code: string;
    name: string;
  } | null;
};

export type SubscriptionPppoeOptionsResponse = {
  items: SubscriptionPppoeOption[];
  source: "radius";
};

export type SubscriptionPppoeOptionsParams = {
  customerId?: number;
  servicePlanId?: number;
  search?: string;
  limit?: number;
};
