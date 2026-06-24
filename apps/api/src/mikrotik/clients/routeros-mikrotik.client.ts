import { RouterOSAPI } from 'node-routeros';
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

type RouterOsRow = Record<string, string | undefined>;

export class RouterOsMikrotikClient implements MikroTikClient {
  constructor(private readonly connection: MikroTikRouterConnection) {}

  async testConnection(): Promise<MikroTikConnectionResult> {
    try {
      const identity = await this.withConnection((api) =>
        api.write('/system/identity/print'),
      );
      const name = identity[0]?.name ?? 'RouterOS';
      return {
        ok: true,
        message: `Connected to ${name} at ${this.connection.host}:${this.connection.apiPort}`,
      };
    } catch (error) {
      return {
        ok: false,
        message: this.formatError(error),
      };
    }
  }

  async listPppoeSecrets(): Promise<MikroTikPppoeSecret[]> {
    const rows = await this.withConnection((api) =>
      api.write('/ppp/secret/print'),
    );

    return rows
      .map((row) => this.mapPppoeSecret(row))
      .filter((secret) => Boolean(secret.username));
  }

  async listPppoeProfiles(): Promise<MikroTikPppProfile[]> {
    const rows = await this.withConnection((api) =>
      api.write('/ppp/profile/print'),
    );

    return rows
      .map((row) => ({ name: row.name ?? '' }))
      .filter((profile) => Boolean(profile.name))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  async listActiveSessions(): Promise<MikroTikActiveSession[]> {
    const rows = await this.withConnection((api) =>
      api.write('/ppp/active/print'),
    );

    return rows
      .map((row) => this.mapActiveSession(row))
      .filter((session) => Boolean(session.username));
  }

  async updatePppoeSecret(
    update: MikroTikPppoeSecretUpdate,
  ): Promise<MikroTikCommandRecord> {
    await this.withConnection(async (api) => {
      const secretId = await this.findSecretId(api, update.username);
      if (!secretId) {
        throw new Error(
          `PPPoE secret "${update.username}" was not found on the router`,
        );
      }

      const params = [`=.id=${secretId}`];

      if (update.newUsername !== undefined) {
        params.push(`=name=${update.newUsername}`);
      }
      if (update.profileName !== undefined) {
        params.push(`=profile=${update.profileName}`);
      }
      if (update.password !== undefined) {
        params.push(`=password=${update.password}`);
      }
      if (update.remoteAddress !== undefined) {
        params.push(
          update.remoteAddress
            ? `=remote-address=${update.remoteAddress}`
            : '=remote-address=',
        );
      }

      if (params.length === 1) {
        throw new Error('No PPPoE secret fields were provided to update');
      }

      await api.write('/ppp/secret/set', params);
    });

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
      message: `RouterOS updated PPPoE secret ${targetUsername}`,
    };
  }

  async enablePppoeSecret(username: string): Promise<MikroTikCommandRecord> {
    return this.setSecretDisabled(username, false);
  }

  async disablePppoeSecret(username: string): Promise<MikroTikCommandRecord> {
    return this.setSecretDisabled(username, true);
  }

  async suspendPppoeSecret(username: string): Promise<MikroTikCommandRecord> {
    return this.disablePppoeSecret(username);
  }

  private async setSecretDisabled(username: string, disabled: boolean) {
    const action = disabled ? 'disable' : 'enable';

    await this.withConnection(async (api) => {
      const secretId = await this.findSecretId(api, username);
      if (!secretId) {
        throw new Error(`PPPoE secret "${username}" was not found on the router`);
      }

      await api.write(`/ppp/secret/${action}`, [`=.id=${secretId}`]);
    });

    return {
      commandType: `${action}_pppoe_secret`,
      payload: { username },
      message: `RouterOS ${action}d PPPoE secret ${username}`,
    };
  }

  private async findSecretId(api: RouterOSAPI, username: string) {
    const rows = (await api.write('/ppp/secret/print', [
      `?name=${username}`,
    ])) as RouterOsRow[];

    return rows[0]?.['.id'];
  }

  private mapPppoeSecret(row: RouterOsRow): MikroTikPppoeSecret {
    return {
      username: row.name ?? '',
      password: row.password,
      profileName: row.profile ?? '',
      remoteAddress: row['remote-address'],
      disabled: row.disabled === 'true' || row.disabled === 'yes',
    };
  }

  private mapActiveSession(row: RouterOsRow): MikroTikActiveSession {
    return {
      username: row.name ?? '',
      ipAddress: row.address,
      macAddress: row['caller-id'],
      uptime: row.uptime,
      rxBytes: this.parseBytes(row['bytes-in'] ?? row['rx-byte']),
      txBytes: this.parseBytes(row['bytes-out'] ?? row['tx-byte']),
    };
  }

  private parseBytes(value?: string) {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private createApi() {
    return new RouterOSAPI({
      host: this.connection.host,
      user: this.connection.username,
      password: this.connection.password,
      port: this.connection.apiPort,
      timeout: 10,
    });
  }

  private async withConnection<T>(work: (api: RouterOSAPI) => Promise<T>) {
    const api = this.createApi();

    try {
      await api.connect();
      return await work(api);
    } finally {
      try {
        api.close();
      } catch {
        // Ignore close errors after a successful command.
      }
    }
  }

  private formatError(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unable to connect to MikroTik router';
  }
}
