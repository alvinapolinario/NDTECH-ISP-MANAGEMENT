import type { CustomerSummary } from "@/types/customer";
import type { OltDeviceStatus, OltPonTechnology } from "@/types/olt-device";
import type { SubscriptionStatus } from "@/types/subscription";

export type OnuDeviceStatus = "online" | "offline" | "los" | "disabled" | "pending";

export type OnuDevice = {
  id: number;
  oltDeviceId: number;
  customerId?: number | null;
  subscriptionId?: number | null;
  name?: string | null;
  serialNumber: string;
  macAddress?: string | null;
  ponPort: string;
  onuId: string;
  vlan?: number | null;
  profileName?: string | null;
  status: OnuDeviceStatus;
  rxPower?: string | number | null;
  txPower?: string | number | null;
  distanceMeters?: number | null;
  lastRegisteredAt?: string | null;
  lastDeregisteredAt?: string | null;
  lastDeregisteredReason?: string | null;
  location?: string | null;
  notes?: string | null;
  lastPolledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  oltDevice: {
    id: number;
    name: string;
    host: string;
    ponTechnology: OltPonTechnology;
    status: OltDeviceStatus;
  };
  customer?: CustomerSummary | null;
  subscription?: {
    id: number;
    status: SubscriptionStatus;
    servicePlan: { id: number; code: string; name: string };
  } | null;
};

export type OnuDeviceListResponse = {
  items: OnuDevice[];
  meta: { total: number; page: number; limit: number };
};

export type OnuDeviceListParams = {
  search?: string;
  status?: OnuDeviceStatus | "";
  oltDeviceId?: number | "";
  customerId?: number | "";
  subscriptionId?: number | "";
  page?: number;
  limit?: number;
};

export type OnuDevicePayload = {
  oltDeviceId: number;
  customerId?: number | null;
  subscriptionId?: number | null;
  name?: string | null;
  serialNumber: string;
  macAddress?: string | null;
  ponPort: string;
  onuId: string;
  vlan?: number | null;
  profileName?: string | null;
  status?: OnuDeviceStatus;
  rxPower?: number | null;
  txPower?: number | null;
  distanceMeters?: number | null;
  lastRegisteredAt?: string | null;
  lastDeregisteredAt?: string | null;
  lastDeregisteredReason?: string | null;
  location?: string | null;
  notes?: string | null;
};
