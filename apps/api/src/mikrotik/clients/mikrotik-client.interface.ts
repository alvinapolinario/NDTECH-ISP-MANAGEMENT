export type MikroTikRouterConnection = {
  host: string;
  apiPort: number;
  username: string;
  password: string;
};

export type MikroTikPppoeSecret = {
  username: string;
  password?: string;
  profileName: string;
  remoteAddress?: string;
  disabled: boolean;
};

export type MikroTikPppProfile = {
  name: string;
};

export type MikroTikActiveSession = {
  username: string;
  ipAddress?: string;
  macAddress?: string;
  uptime?: string;
  rxBytes: number;
  txBytes: number;
};

export type MikroTikConnectionResult = {
  ok: boolean;
  message: string;
};

export type MikroTikCommandRecord = {
  commandType: string;
  payload?: Record<string, unknown>;
  message: string;
};

export type MikroTikPppoeSecretUpdate = {
  username: string;
  profileName?: string;
  password?: string;
  remoteAddress?: string | null;
  newUsername?: string;
};

export interface MikroTikClient {
  testConnection(): Promise<MikroTikConnectionResult>;
  listPppoeSecrets(): Promise<MikroTikPppoeSecret[]>;
  listPppoeProfiles(): Promise<MikroTikPppProfile[]>;
  listActiveSessions(): Promise<MikroTikActiveSession[]>;
  updatePppoeSecret(
    update: MikroTikPppoeSecretUpdate,
  ): Promise<MikroTikCommandRecord>;
  enablePppoeSecret(username: string): Promise<MikroTikCommandRecord>;
  disablePppoeSecret(username: string): Promise<MikroTikCommandRecord>;
  suspendPppoeSecret(username: string): Promise<MikroTikCommandRecord>;
}
