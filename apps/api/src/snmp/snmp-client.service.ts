import { BadRequestException, Injectable } from '@nestjs/common';
import * as snmp from 'net-snmp';
import type { SnmpScalarValue, SnmpSessionConfig, SnmpTestResult } from './snmp.types';
import { SNMP_STANDARD } from './snmp.constants';

@Injectable()
export class SnmpClientService {
  private readonly defaultTimeoutMs = Number(process.env.SNMP_TIMEOUT_MS ?? 5000);
  private readonly defaultRetries = Number(process.env.SNMP_RETRIES ?? 1);

  assertV2cOnly(version: string | undefined | null) {
    if (version && version !== 'v2c') {
      throw new BadRequestException('Only SNMP v2c is supported');
    }
  }

  async testConnection(config: SnmpSessionConfig): Promise<SnmpTestResult> {
    const started = Date.now();
    try {
      const values = await this.get(config, [
        SNMP_STANDARD.sysDescr,
        SNMP_STANDARD.sysUpTime,
        SNMP_STANDARD.sysName,
      ]);
      return {
        success: true,
        latencyMs: Date.now() - started,
        sysDescr: this.asString(values[SNMP_STANDARD.sysDescr]),
        sysName: this.asString(values[SNMP_STANDARD.sysName]),
        sysUpTime: this.timeticksToSeconds(values[SNMP_STANDARD.sysUpTime]),
      };
    } catch (error) {
      return {
        success: false,
        latencyMs: Date.now() - started,
        error: error instanceof Error ? error.message : 'SNMP request failed',
      };
    }
  }

  async get(
    config: SnmpSessionConfig,
    oids: string[],
  ): Promise<Record<string, SnmpScalarValue>> {
    const session = this.createSession(config);
    try {
      const varbinds = await this.promisifyGet(session, oids);
      const result: Record<string, SnmpScalarValue> = {};
      for (const vb of varbinds) {
        if (snmp.isVarbindError(vb)) {
          throw new Error(snmp.varbindError(vb));
        }
        result[vb.oid] = this.normalizeValue(vb.value);
      }
      return result;
    } finally {
      session.close();
    }
  }

  async walk(config: SnmpSessionConfig, oid: string): Promise<Array<{ oid: string; value: SnmpScalarValue }>> {
    const session = this.createSession(config);
    try {
      const rows: Array<{ oid: string; value: SnmpScalarValue }> = [];
      await new Promise<void>((resolve, reject) => {
        const feedCb = (varbinds: snmp.VarBind[]) => {
          for (const vb of varbinds) {
            if (snmp.isVarbindError(vb)) {
              reject(new Error(snmp.varbindError(vb)));
              return;
            }
            rows.push({ oid: vb.oid, value: this.normalizeValue(vb.value) });
          }
        };
        const doneCb = (error: Error | null) => {
          if (error) reject(error);
          else resolve();
        };
        session.subtree(oid, feedCb, doneCb);
      });
      return rows;
    } finally {
      session.close();
    }
  }

  private createSession(config: SnmpSessionConfig) {
    if (!config.community?.trim()) {
      throw new BadRequestException('SNMP community is required');
    }
    return snmp.createSession(config.host, config.community, {
      port: config.port ?? 161,
      version: snmp.Version2c,
      timeout: config.timeoutMs ?? this.defaultTimeoutMs,
      retries: config.retries ?? this.defaultRetries,
    });
  }

  private promisifyGet(session: snmp.Session, oids: string[]): Promise<snmp.VarBind[]> {
    return new Promise((resolve, reject) => {
      session.get(oids, (error, varbinds) => {
        if (error) reject(error);
        else resolve(varbinds);
      });
    });
  }

  private normalizeValue(value: unknown): SnmpScalarValue {
    if (value === null || value === undefined) return null;
    if (Buffer.isBuffer(value)) return value.toString('utf8').replace(/\0/g, '').trim();
    if (typeof value === 'number') return value;
    if (typeof value === 'bigint') return Number(value);
    return String(value).trim();
  }

  private asString(value: SnmpScalarValue | undefined): string | null {
    if (value === null || value === undefined) return null;
    return String(value);
  }

  private timeticksToSeconds(value: SnmpScalarValue | undefined): number | null {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    return Math.floor(numeric / 100);
  }
}
