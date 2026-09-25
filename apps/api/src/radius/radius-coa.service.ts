import { Injectable, Logger } from '@nestjs/common';
import { createSocket } from 'node:dgram';
import * as radius from 'radius';
import { RadiusDbService } from './radius-db.service';
import {
  getRadiusCoaPort,
  getRadiusCoaTimeoutMs,
  getRadiusDefaultNasSecret,
  isRadiusCoaEnabled,
  shouldMockRadiusCoa,
} from './radius-coa.config';

export type RadiusActiveSession = {
  radacctId: number;
  username: string;
  acctSessionId: string;
  nasIpAddress: string;
  framedIpAddress: string | null;
};

export type RadiusCoaAttempt = {
  nasIpAddress: string;
  acctSessionId: string;
  framedIpAddress: string | null;
  ack: boolean;
  message: string;
};

export type RadiusCoaResult = {
  username: string;
  sessionCount: number;
  disconnectedCount: number;
  attempts: RadiusCoaAttempt[];
  summary: string;
};

@Injectable()
export class RadiusCoaService {
  private readonly logger = new Logger(RadiusCoaService.name);

  constructor(private readonly radiusDb: RadiusDbService) {}

  isEnabled() {
    return isRadiusCoaEnabled() && this.radiusDb.isConfigured();
  }

  async listActiveSessions(username: string): Promise<RadiusActiveSession[]> {
    if (!this.radiusDb.isConfigured()) {
      return [];
    }

    const rows = await this.radiusDb.query<{
      radacctId: number;
      username: string;
      acctSessionId: string;
      nasIpAddress: string;
      framedIpAddress: string | null;
    }>(
      `
        SELECT
          radacctid AS radacctId,
          username,
          acctsessionid AS acctSessionId,
          nasipaddress AS nasIpAddress,
          NULLIF(framedipaddress, '') AS framedIpAddress
        FROM radacct
        WHERE username = :username
          AND acctstoptime IS NULL
        ORDER BY COALESCE(acctupdatetime, acctstarttime) DESC
      `,
      { username },
    );

    return rows.map((row) => ({
      radacctId: Number(row.radacctId),
      username: row.username,
      acctSessionId: row.acctSessionId,
      nasIpAddress: row.nasIpAddress,
      framedIpAddress: row.framedIpAddress,
    }));
  }

  async disconnectUser(username: string): Promise<RadiusCoaResult> {
    if (!this.isEnabled()) {
      return this.emptyResult(username, 'CoA disabled');
    }

    const sessions = await this.listActiveSessions(username);
    if (!sessions.length) {
      return this.emptyResult(username, 'No active RADIUS sessions');
    }

    const attempts: RadiusCoaAttempt[] = [];

    for (const session of sessions) {
      const secret = await this.resolveNasSecret(session.nasIpAddress);
      if (!secret) {
        attempts.push({
          nasIpAddress: session.nasIpAddress,
          acctSessionId: session.acctSessionId,
          framedIpAddress: session.framedIpAddress,
          ack: false,
          message: `No NAS secret found for ${session.nasIpAddress}`,
        });
        continue;
      }

      const attempt = await this.sendDisconnect(session, secret);
      attempts.push(attempt);
    }

    const disconnectedCount = attempts.filter((attempt) => attempt.ack).length;

    return {
      username,
      sessionCount: sessions.length,
      disconnectedCount,
      attempts,
      summary:
        disconnectedCount > 0
          ? `Disconnected ${disconnectedCount}/${sessions.length} session(s)`
          : `CoA attempted for ${sessions.length} session(s); no ACK received`,
    };
  }

  private async resolveNasSecret(nasIpAddress: string): Promise<string | null> {
    const rows = await this.radiusDb.query<{ secret: string }>(
      `
        SELECT secret
        FROM nas
        WHERE nasname = :nasIpAddress
           OR server = :nasIpAddress
        ORDER BY id ASC
        LIMIT 1
      `,
      { nasIpAddress },
    );

    const fromNasTable = rows[0]?.secret?.trim();
    if (fromNasTable) {
      return fromNasTable;
    }

    const fallback = getRadiusDefaultNasSecret();
    return fallback || null;
  }

  private async sendDisconnect(
    session: RadiusActiveSession,
    secret: string,
  ): Promise<RadiusCoaAttempt> {
    if (shouldMockRadiusCoa()) {
      const message = `Mock CoA disconnect for ${session.username} on ${session.nasIpAddress}`;
      this.logger.log(message);
      return {
        nasIpAddress: session.nasIpAddress,
        acctSessionId: session.acctSessionId,
        framedIpAddress: session.framedIpAddress,
        ack: true,
        message,
      };
    }

    const attributes: Array<[string, string]> = [['User-Name', session.username]];

    if (session.acctSessionId) {
      attributes.push(['Acct-Session-Id', session.acctSessionId]);
    }

    if (session.framedIpAddress) {
      attributes.push(['Framed-IP-Address', session.framedIpAddress]);
    }

    try {
      const response = await this.sendDisconnectPacket(
        session.nasIpAddress,
        secret,
        attributes,
      );

      return {
        nasIpAddress: session.nasIpAddress,
        acctSessionId: session.acctSessionId,
        framedIpAddress: session.framedIpAddress,
        ack: response.ack,
        message: response.message,
      };
    } catch (error) {
      return {
        nasIpAddress: session.nasIpAddress,
        acctSessionId: session.acctSessionId,
        framedIpAddress: session.framedIpAddress,
        ack: false,
        message:
          error instanceof Error ? error.message : 'CoA disconnect failed',
      };
    }
  }

  private sendDisconnectPacket(
    nasHost: string,
    secret: string,
    attributes: Array<[string, string]>,
  ): Promise<{ ack: boolean; message: string }> {
    const port = getRadiusCoaPort();
    const timeoutMs = getRadiusCoaTimeoutMs();
    const identifier = Math.floor(Math.random() * 65535);

    const packet = radius.encode({
      code: 'Disconnect-Request',
      secret,
      identifier,
      attributes,
    });

    return new Promise((resolve) => {
      const socket = createSocket('udp4');
      let settled = false;

      const finish = (result: { ack: boolean; message: string }) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        socket.close();
        resolve(result);
      };

      const timer = setTimeout(() => {
        finish({
          ack: false,
          message: `CoA timeout after ${timeoutMs}ms`,
        });
      }, timeoutMs);

      socket.on('message', (message) => {
        try {
          const decoded = radius.decode({ packet: message, secret });
          finish({
            ack: decoded.code === 'Disconnect-ACK',
            message: decoded.code,
          });
        } catch {
          finish({ ack: false, message: 'Invalid CoA response' });
        }
      });

      socket.on('error', (error) => {
        finish({ ack: false, message: error.message });
      });

      socket.send(packet, port, nasHost, (error) => {
        if (error) {
          finish({ ack: false, message: error.message });
        }
      });
    });
  }

  private emptyResult(username: string, summary: string): RadiusCoaResult {
    return {
      username,
      sessionCount: 0,
      disconnectedCount: 0,
      attempts: [],
      summary,
    };
  }
}
