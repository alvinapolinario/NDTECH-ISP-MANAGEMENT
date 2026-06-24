export type SnmpScalarValue = string | number | null;

export interface SnmpSessionConfig {
  host: string;
  port?: number;
  community: string;
  timeoutMs?: number;
  retries?: number;
}

export interface SnmpTestResult {
  success: boolean;
  latencyMs: number;
  sysDescr?: string | null;
  sysName?: string | null;
  sysUpTime?: number | null;
  error?: string;
}

export interface SnmpSystemMetrics {
  sysDescr: string | null;
  sysName: string | null;
  uptimeSeconds: number | null;
  cpuUsagePercent: number | null;
  memoryUsagePercent: number | null;
}

export interface SnmpInterfaceSummary {
  total: number;
  up: number;
  down: number;
  errors: number;
}

export interface OnuSnmpReading {
  ponPort: string;
  onuId: string;
  serialNumber?: string | null;
  rxPower?: number | null;
  txPower?: number | null;
  distanceMeters?: number | null;
  status?: 'online' | 'offline' | 'los' | 'disabled' | 'pending';
}

export interface OltPollResult extends SnmpSystemMetrics {
  success: boolean;
  latencyMs: number;
  onuReadings: OnuSnmpReading[];
  onuUpdated: number;
  error?: string;
}

export interface SwitchPollResult extends SnmpSystemMetrics {
  success: boolean;
  latencyMs: number;
  interfaces: SnmpInterfaceSummary;
  error?: string;
}
