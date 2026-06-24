import type { CustomerSummary } from "@/types/customer";
import type { ServicePlanSummary } from "@/types/service-plan";

export type MikrotikRouterStatus = "active" | "inactive";
export type PppoeAccountStatus = "active" | "suspended" | "disabled";
export type PppoeSessionStatus = "online" | "offline";

export type MikrotikRouter = {
  id: number;
  name: string;
  host: string;
  apiPort: number;
  username: string;
  status: MikrotikRouterStatus;
  lastConnectionCheckAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    pppoeAccounts: number;
    commandLogs: number;
  };
};

export type PppoeAccount = {
  id: number;
  customerId: number | null;
  servicePlanId: number | null;
  routerId: number;
  username: string;
  hasPassword: boolean;
  profileName: string;
  activeProfileName?: string | null;
  remoteAddress?: string | null;
  status: PppoeAccountStatus;
  lastSyncedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: CustomerSummary | null;
  servicePlan?: (ServicePlanSummary & { pppoeProfileName?: string | null }) | null;
  router: {
    id: number;
    name: string;
    host: string;
    status: MikrotikRouterStatus;
    lastConnectionCheckAt?: string | null;
  };
};

export type PppoeSession = {
  id: number;
  pppoeAccountId: number | null;
  routerId: number;
  username: string;
  ipAddress?: string | null;
  macAddress?: string | null;
  uptime?: string | null;
  rxBytes: string;
  txBytes: string;
  status: PppoeSessionStatus;
  checkedAt: string;
  pppoeAccount: {
    id: number;
    username: string;
    status: PppoeAccountStatus;
    customer?: CustomerSummary | null;
    servicePlan?: { id: number; code: string; name: string } | null;
  } | null;
  router: { id: number; name: string; host: string };
};

export type ListResponse<T> = {
  items: T[];
  meta: { total: number; page: number; limit: number };
};
