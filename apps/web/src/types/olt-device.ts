export type OltDeviceStatus = "active" | "inactive" | "maintenance";
export type OltPonTechnology = "gpon" | "epon" | "xgpon" | "xgspon" | "xpon";
export type SnmpVersion = "v1" | "v2c" | "v3";

export type OltDevice = {
  id: number;
  name: string;
  vendor: string;
  model?: string | null;
  host: string;
  managementIp?: string | null;
  ponTechnology: OltPonTechnology;
  ponPortCount: number;
  uplinkPortCount: number;
  snmpVersion: SnmpVersion;
  snmpCommunity?: string | null;
  snmpPort?: number;
  sysDescr?: string | null;
  sysName?: string | null;
  uptimeSeconds?: number | null;
  status: OltDeviceStatus;
  location?: string | null;
  notes?: string | null;
  lastPolledAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OltDeviceListResponse = {
  items: OltDevice[];
  meta: { total: number; page: number; limit: number };
};

export type OltDeviceListParams = {
  search?: string;
  status?: OltDeviceStatus | "";
  ponTechnology?: OltPonTechnology | "";
  page?: number;
  limit?: number;
};

export type OltDevicePayload = {
  name: string;
  vendor: string;
  model?: string | null;
  host: string;
  managementIp?: string | null;
  ponTechnology?: OltPonTechnology;
  ponPortCount?: number;
  uplinkPortCount?: number;
  snmpVersion?: SnmpVersion;
  snmpCommunity?: string | null;
  snmpPort?: number;
  status?: OltDeviceStatus;
  location?: string | null;
  notes?: string | null;
};
