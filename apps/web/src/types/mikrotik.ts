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

export type SessionSource = "both" | "mikrotik" | "radius";

export type UnifiedActiveSession = {
  username: string;
  customerName: string | null;
  pppoeAccountId: number | null;
  ipAddress: string | null;
  macAddress: string | null;
  routerName: string;
  uptime: string | null;
  mikrotikRxBytes: string | null;
  mikrotikTxBytes: string | null;
  radiusUploadBytes: string | null;
  radiusDownloadBytes: string | null;
  radiusTotalBytes: string | null;
  sources: SessionSource[];
  acctStartTime: string | null;
  acctUpdateTime: string | null;
  checkedAt: string | null;
};

export type TrafficRankingEntry = {
  rank: number;
  username: string;
  customerName: string | null;
  pppoeAccountId: number | null;
  ipAddress: string | null;
  macAddress: string | null;
  uploadBytes: string;
  downloadBytes: string;
  totalBytes: string;
  sessionCount: number;
  sources: SessionSource[];
};

export type PppoeOnlineSummary = {
  totalOnline: number;
  routers: Array<{
    id: number;
    name: string;
    host: string;
    onlineCount: number;
    lastRefreshedAt: string | null;
  }>;
  generatedAt: string;
};

export type PppoeSessionMonitoring = {
  router: { id: number; name: string; host: string };
  radiusConfigured: boolean;
  summary: {
    mikrotikActive: number;
    radiusActive: number;
    matched: number;
    mikrotikOnly: number;
    radiusOnly: number;
    totalUnique: number;
  };
  trafficRanking?: TrafficRankingEntry[];
  /** @deprecated Use trafficRanking */
  topBandwidthUsers?: TrafficRankingEntry[];
  sessions: UnifiedActiveSession[];
  generatedAt: string;
};
