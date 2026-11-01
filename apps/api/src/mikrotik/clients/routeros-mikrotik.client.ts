import { RouterOSAPI } from 'node-routeros';
import './routeros-empty-reply.patch';
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
      this.writePrint(api, '/ppp/secret/print'),
    );

    return rows
      .map((row) => this.mapPppoeSecret(row))
      .filter((secret) => Boolean(secret.username));
  }

  async listPppoeProfiles(): Promise<MikroTikPppProfile[]> {
    const rows = await this.withConnection((api) =>
      this.writePrint(api, '/ppp/profile/print'),
    );

    return rows
      .map((row) => ({ name: row.name ?? '' }))
      .filter((profile) => Boolean(profile.name))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  async listActiveSessions(): Promise<MikroTikActiveSession[]> {
    const rows = await this.withConnection((api) =>
      this.writePrint(api, '/ppp/active/print'),
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
    const rows = await this.writePrint(api, '/ppp/secret/print', [
      `?name=${username}`,
    ]);

    return rows[0]?.['.id'];
  }

  private async writePrint(
    api: RouterOSAPI,
    command: string,
    params: string[] = [],
  ): Promise<RouterOsRow[]> {
    try {
      return (await api.write(command, params)) as RouterOsRow[];
    } catch (error) {
      if (this.isEmptyListReply(error)) {
        return [];
      }

      throw error;
    }
  }

  private isEmptyListReply(error: unknown) {
    const errno = (error as { errno?: unknown })?.errno;
    const message =
      error instanceof Error ? error.message : String(error ?? '');

    return errno === 'UNKNOWNREPLY' && message.includes('!empty');
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
    const username = row.name ?? row.user ?? row['user-name'] ?? '';

    return {
      username,
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
    const timeout = Number(process.env.MIKROTIK_API_TIMEOUT ?? 60);

    return new RouterOSAPI({
      host: this.connection.host,
      user: this.connection.username,
      password: this.connection.password,
      port: this.connection.apiPort,
      timeout: Number.isFinite(timeout) && timeout > 0 ? timeout : 60,
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
    if (this.isEmptyListReply(error)) {
      return 'Router returned an empty list.';
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message.trim();
    }

    const errno = (error as { errno?: number | string })?.errno;
    if (errno === -111 || errno === -61) {
      return 'Connection refused. Enable RouterOS API (/ip service enable api) and allow this server in the firewall.';
    }
    if (errno === -110 || errno === -60) {
      return 'Connection timed out. Check router host, routing, and firewall rules.';
    }

    return 'Unable to connect to MikroTik router';
  }
}
