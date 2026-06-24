import {
  MikroTikActiveSession,
  MikroTikClient,
  MikroTikCommandRecord,
  MikroTikConnectionResult,
  MikroTikPppoeSecret,
  MikroTikPppoeSecretUpdate,
  MikroTikPppProfile,
  MikroTikRouterConnection,
} from './mikrotik-client.interface';

export class MockMikroTikClient implements MikroTikClient {
  constructor(private readonly connection: MikroTikRouterConnection) {}

  async testConnection(): Promise<MikroTikConnectionResult> {
    return {
      ok: true,
      message: `Mock connection OK for ${this.connection.username}@${this.connection.host}:${this.connection.apiPort}`,
    };
  }

  async listPppoeSecrets(): Promise<MikroTikPppoeSecret[]> {
    return [
      {
        username: 'juan.pppoe',
        password: 'pppoe-password',
        profileName: 'FIBER-50',
        remoteAddress: '10.10.10.10',
        disabled: false,
      },
      {
        username: 'demo.disabled',
        profileName: 'FIBER-25',
        disabled: true,
      },
    ];
  }

  async listPppoeProfiles(): Promise<MikroTikPppProfile[]> {
    return [
      { name: 'default' },
      { name: '30mbps' },
      { name: '50mbps' },
      { name: 'FIBER-25' },
      { name: 'FIBER-50' },
    ];
  }

  async listActiveSessions(): Promise<MikroTikActiveSession[]> {
    return [];
  }

  async updatePppoeSecret(
    update: MikroTikPppoeSecretUpdate,
  ): Promise<MikroTikCommandRecord> {
    const targetUsername = update.newUsername ?? update.username;

    return {
      commandType: 'update_pppoe_secret',
      payload: {
        username: update.username,
        newUsername: update.newUsername,
        profileName: update.profileName,
        hasPassword: Boolean(update.password),
        remoteAddress: update.remoteAddress,
      },
      message: `Mock updated PPPoE secret ${targetUsername} via /ppp/secret/set`,
    };
  }

  async enablePppoeSecret(username: string): Promise<MikroTikCommandRecord> {
    return {
      commandType: 'enable_pppoe_secret',
      payload: { username },
      message: `Mock enable PPPoE secret ${username}`,
    };
  }

  async disablePppoeSecret(username: string): Promise<MikroTikCommandRecord> {
    return {
      commandType: 'disable_pppoe_secret',
      payload: { username },
      message: `Mock disable PPPoE secret ${username}`,
    };
  }

  async suspendPppoeSecret(username: string): Promise<MikroTikCommandRecord> {
    return {
      commandType: 'suspend_pppoe_secret',
      payload: { username },
      message: `Mock suspend PPPoE secret ${username}`,
    };
  }
}
