export type SwitchVendor = "mikrotik" | "unifi" | "edgeswitch";
export type SwitchDeviceStatus = "active" | "inactive" | "maintenance";
export type SnmpVersion = "v2c";

export type SwitchDevice = {
  id: number;
  name: string;
  vendor: SwitchVendor;
  model?: string | null;
  host: string;
  managementIp?: string | null;
  snmpVersion: SnmpVersion;
  snmpCommunity?: string | null;
  snmpPort: number;
  status: SwitchDeviceStatus;
  location?: string | null;
  notes?: string | null;
  sysDescr?: string | null;
  sysName?: string | null;
  uptimeSeconds?: number | null;
  cpuUsagePercent?: string | number | null;
  memoryUsagePercent?: string | number | null;
  portCount: number;
  portsUp: number;
  lastPolledAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SwitchDeviceListResponse = {
  items: SwitchDevice[];
  meta: { total: number; page: number; limit: number };
};

export type SwitchDeviceListParams = {
  search?: string;
  status?: SwitchDeviceStatus | "";
  vendor?: SwitchVendor | "";
  page?: number;
  limit?: number;
};

export type SwitchDevicePayload = {
  name: string;
  vendor: SwitchVendor;
  model?: string | null;
  host: string;
  managementIp?: string | null;
  snmpVersion?: SnmpVersion;
  snmpCommunity?: string | null;
  snmpPort?: number;
  status?: SwitchDeviceStatus;
  location?: string | null;
  notes?: string | null;
};
