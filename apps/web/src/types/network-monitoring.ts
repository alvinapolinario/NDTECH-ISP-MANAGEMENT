import type { MikrotikRouterStatus } from "@/types/mikrotik";
import type { OltDeviceStatus } from "@/types/olt-device";
import type { OnuDeviceStatus } from "@/types/onu-device";

export type NetworkMonitorDeviceType =
  | "mikrotik_router"
  | "olt_device"
  | "onu_device"
  | "other";

export type NetworkMonitorMethod = "icmp" | "snmp" | "manual";
export type NetworkMonitorStatus = "online" | "degraded" | "offline" | "unknown";

export type NetworkMonitoringTarget = {
  id: number;
  name: string;
  deviceType: NetworkMonitorDeviceType;
  monitorMethod: NetworkMonitorMethod;
  host: string;
  mikrotikRouterId?: number | null;
  oltDeviceId?: number | null;
  onuDeviceId?: number | null;
  snmpCommunity?: string | null;
  status: NetworkMonitorStatus;
  latencyMs?: string | number | null;
  packetLossPercent?: string | number | null;
  uptimeSeconds?: string | number | null;
  cpuUsagePercent?: string | number | null;
  memoryUsagePercent?: string | number | null;
  interfaceStatus?: string | null;
  interfaceErrors?: string | number | null;
  lastCheckedAt?: string | null;
  location?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  mikrotikRouter?: {
    id: number;
    name: string;
    host: string;
    status: MikrotikRouterStatus;
  } | null;
  oltDevice?: {
    id: number;
    name: string;
    host: string;
    status: OltDeviceStatus;
  } | null;
  onuDevice?: {
    id: number;
    name?: string | null;
    serialNumber: string;
    ponPort: string;
    onuId: string;
    status: OnuDeviceStatus;
  } | null;
  _count?: { checks: number };
};

export type NetworkMonitoringCheck = {
  id: number;
  targetId: number;
  status: NetworkMonitorStatus;
  latencyMs?: string | number | null;
  packetLossPercent?: string | number | null;
  uptimeSeconds?: string | number | null;
  cpuUsagePercent?: string | number | null;
  memoryUsagePercent?: string | number | null;
  interfaceStatus?: string | null;
  interfaceErrors?: string | number | null;
  checkedAt: string;
  notes?: string | null;
};

export type NetworkMonitoringSummary = {
  total: number;
  online: number;
  degraded: number;
  offline: number;
  unknown: number;
};

export type NetworkMonitoringListResponse = {
  items: NetworkMonitoringTarget[];
  meta: { total: number; page: number; limit: number };
  summary: NetworkMonitoringSummary;
};

export type NetworkMonitoringListParams = {
  search?: string;
  status?: NetworkMonitorStatus | "";
  deviceType?: NetworkMonitorDeviceType | "";
  page?: number;
  limit?: number;
};

export type NetworkMonitoringTargetPayload = {
  name: string;
  deviceType?: NetworkMonitorDeviceType;
  monitorMethod?: NetworkMonitorMethod;
  host: string;
  mikrotikRouterId?: number | null;
  oltDeviceId?: number | null;
  onuDeviceId?: number | null;
  snmpCommunity?: string | null;
  status?: NetworkMonitorStatus;
  latencyMs?: number | null;
  packetLossPercent?: number | null;
  uptimeSeconds?: number | null;
  cpuUsagePercent?: number | null;
  memoryUsagePercent?: number | null;
  interfaceStatus?: string | null;
  interfaceErrors?: number | null;
  lastCheckedAt?: string | null;
  location?: string | null;
  notes?: string | null;
};

export type NetworkMonitoringCheckPayload = {
  status: NetworkMonitorStatus;
  latencyMs?: number | null;
  packetLossPercent?: number | null;
  uptimeSeconds?: number | null;
  cpuUsagePercent?: number | null;
  memoryUsagePercent?: number | null;
  interfaceStatus?: string | null;
  interfaceErrors?: number | null;
  checkedAt?: string | null;
  notes?: string | null;
};
