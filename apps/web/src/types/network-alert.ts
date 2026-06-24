import type {
  NetworkMonitorDeviceType,
  NetworkMonitorStatus,
} from "@/types/network-monitoring";

export type NetworkAlertSeverity = "info" | "warning" | "critical";
export type NetworkAlertStatus = "open" | "acknowledged" | "resolved" | "dismissed";
export type NetworkAlertSource = "monitoring" | "manual" | "system";

export type NetworkAlert = {
  id: number;
  targetId?: number | null;
  checkId?: number | null;
  title: string;
  description?: string | null;
  severity: NetworkAlertSeverity;
  status: NetworkAlertStatus;
  source: NetworkAlertSource;
  metric?: string | null;
  threshold?: string | null;
  observedValue?: string | null;
  assignedTo?: string | null;
  acknowledgedBy?: string | null;
  acknowledgedAt?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  resolution?: string | null;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
  target?: {
    id: number;
    name: string;
    host: string;
    deviceType: NetworkMonitorDeviceType;
    status: NetworkMonitorStatus;
    location?: string | null;
    mikrotikRouter?: { id: number; name: string; host: string } | null;
    oltDevice?: { id: number; name: string; host: string } | null;
    onuDevice?: {
      id: number;
      name?: string | null;
      serialNumber: string;
      ponPort: string;
      onuId: string;
    } | null;
  } | null;
  check?: {
    id: number;
    status: NetworkMonitorStatus;
    latencyMs?: string | number | null;
    packetLossPercent?: string | number | null;
    checkedAt: string;
  } | null;
};

export type NetworkAlertSummary = {
  total: number;
  open: number;
  acknowledged: number;
  resolved: number;
  dismissed: number;
  severity: { info: number; warning: number; critical: number };
};

export type NetworkAlertListResponse = {
  items: NetworkAlert[];
  meta: { total: number; page: number; limit: number };
  summary: NetworkAlertSummary;
};

export type NetworkAlertListParams = {
  search?: string;
  status?: NetworkAlertStatus | "";
  severity?: NetworkAlertSeverity | "";
  page?: number;
  limit?: number;
};

export type NetworkAlertPayload = {
  targetId?: number | null;
  checkId?: number | null;
  title: string;
  description?: string | null;
  severity?: NetworkAlertSeverity;
  status?: NetworkAlertStatus;
  source?: NetworkAlertSource;
  metric?: string | null;
  threshold?: string | null;
  observedValue?: string | null;
  assignedTo?: string | null;
  occurredAt?: string | null;
};
