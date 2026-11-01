import { Injectable } from '@nestjs/common';
import { CDATA_SNMP, MIKROTIK_SNMP, SNMP_STANDARD, UBIQUITI_SNMP, VSOL_SNMP } from './snmp.constants';
import { SnmpClientService } from './snmp-client.service';
import type {
  OnuSnmpReading,
  OltPollResult,
  SnmpInterfaceSummary,
  SnmpSessionConfig,
  SnmpSystemMetrics,
  SwitchPollResult,
} from './snmp.types';
import {
  isCdataVendor,
  isEdgeSwitchVendor,
  isMikrotikVendor,
  isUnifiVendor,
  isVsolVendor,
  parseInteger,
  parseOpticalPowerDbm,
} from './snmp-value.util';

@Injectable()
export class SnmpPollingService {
  constructor(private readonly snmpClient: SnmpClientService) {}

  async pollOlt(
    vendor: string,
    config: SnmpSessionConfig,
  ): Promise<OltPollResult> {
    const started = Date.now();
    try {
      const system = await this.readSystemMetrics(config, vendor);
      const onuReadings = await this.readOltOnuTable(vendor, config);
      return {
        success: true,
        latencyMs: Date.now() - started,
        onuReadings,
        onuUpdated: 0,
        ...system,
      };
    } catch (error) {
      return {
        success: false,
        latencyMs: Date.now() - started,
        onuReadings: [],
        onuUpdated: 0,
        sysDescr: null,
        sysName: null,
        uptimeSeconds: null,
        cpuUsagePercent: null,
        memoryUsagePercent: null,
        error: error instanceof Error ? error.message : 'OLT poll failed',
      };
    }
  }

  async pollSwitch(
    vendor: string,
    config: SnmpSessionConfig,
  ): Promise<SwitchPollResult> {
    const started = Date.now();
    try {
      const system = await this.readSystemMetrics(config, vendor);
      const interfaces = await this.readInterfaceSummary(config);
      return {
        success: true,
        latencyMs: Date.now() - started,
        interfaces,
        ...system,
      };
    } catch (error) {
      return {
        success: false,
        latencyMs: Date.now() - started,
        interfaces: { total: 0, up: 0, down: 0, errors: 0 },
        sysDescr: null,
        sysName: null,
        uptimeSeconds: null,
        cpuUsagePercent: null,
        memoryUsagePercent: null,
        error: error instanceof Error ? error.message : 'Switch poll failed',
      };
    }
  }

  testConnection(config: SnmpSessionConfig) {
    return this.snmpClient.testConnection(config);
  }

  private async readSystemMetrics(
    config: SnmpSessionConfig,
    vendor: string,
  ): Promise<SnmpSystemMetrics> {
    const oids: string[] = [
      SNMP_STANDARD.sysDescr,
      SNMP_STANDARD.sysUpTime,
      SNMP_STANDARD.sysName,
    ];
    if (isMikrotikVendor(vendor)) {
      oids.push(MIKROTIK_SNMP.cpuLoad, MIKROTIK_SNMP.memoryUsage, MIKROTIK_SNMP.totalMemory);
    } else if (isUnifiVendor(vendor) || isEdgeSwitchVendor(vendor)) {
      oids.push(UBIQUITI_SNMP.cpuUsage, UBIQUITI_SNMP.memoryUsage);
    }

    const values = await this.snmpClient.get(config, oids);
    let cpuUsagePercent: number | null = null;
    let memoryUsagePercent: number | null = null;

    if (isMikrotikVendor(vendor)) {
      cpuUsagePercent = parseInteger(values[MIKROTIK_SNMP.cpuLoad]);
      const used = parseInteger(values[MIKROTIK_SNMP.memoryUsage]);
      const total = parseInteger(values[MIKROTIK_SNMP.totalMemory]);
      if (used !== null && total && total > 0) {
        memoryUsagePercent = Math.round((used / total) * 10000) / 100;
      }
    } else if (isUnifiVendor(vendor) || isEdgeSwitchVendor(vendor)) {
      cpuUsagePercent = parseInteger(values[UBIQUITI_SNMP.cpuUsage]);
      memoryUsagePercent = parseInteger(values[UBIQUITI_SNMP.memoryUsage]);
    }

    return {
      sysDescr: values[SNMP_STANDARD.sysDescr] != null ? String(values[SNMP_STANDARD.sysDescr]) : null,
      sysName: values[SNMP_STANDARD.sysName] != null ? String(values[SNMP_STANDARD.sysName]) : null,
      uptimeSeconds: this.timeticksToSeconds(values[SNMP_STANDARD.sysUpTime]),
      cpuUsagePercent,
      memoryUsagePercent,
    };
  }

  private async readInterfaceSummary(config: SnmpSessionConfig): Promise<SnmpInterfaceSummary> {
    const [statusRows, inErrorRows, outErrorRows] = await Promise.all([
      this.snmpClient.walk(config, SNMP_STANDARD.ifOperStatus),
      this.snmpClient.walk(config, SNMP_STANDARD.ifInErrors),
      this.snmpClient.walk(config, SNMP_STANDARD.ifOutErrors),
    ]);

    let up = 0;
    let down = 0;
    for (const row of statusRows) {
      const status = Number(row.value);
      if (status === 1) up += 1;
      else down += 1;
    }

    let errors = 0;
    for (const row of [...inErrorRows, ...outErrorRows]) {
      errors += Number(row.value) || 0;
    }

    return {
      total: statusRows.length,
      up,
      down,
      errors,
    };
  }

  private async readOltOnuTable(vendor: string, config: SnmpSessionConfig): Promise<OnuSnmpReading[]> {
    if (isCdataVendor(vendor)) return this.readCdataOnuTable(config);
    if (isVsolVendor(vendor)) return this.readVsolOnuTable(config);
    return [];
  }

  private async readCdataOnuTable(config: SnmpSessionConfig): Promise<OnuSnmpReading[]> {
    const [configRows, opticalRows] = await Promise.all([
      this.snmpClient.walk(config, CDATA_SNMP.gponOnuConfigTable),
      this.snmpClient.walk(config, CDATA_SNMP.gponOnuOpticalTable),
    ]);

    const configByKey = new Map<string, { serial?: string; onuId?: string; ponPort?: string }>();
    for (const row of configRows) {
      const suffix = row.oid.replace(`${CDATA_SNMP.gponOnuConfigTable}.`, '');
      const parts = suffix.split('.');
      if (parts.length < 5) continue;
      const column = Number(parts[parts.length - 1]);
      const key = parts.slice(0, -1).join('.');
      const entry = configByKey.get(key) ?? {};
      if (column === CDATA_SNMP.gponOnuSn) entry.serial = String(row.value ?? '').trim();
      if (column === 1) entry.onuId = String(row.value ?? '').trim();
      if (column === 3) {
        const [, , , portId] = parts;
        entry.ponPort = portId ? `pon-${portId}` : undefined;
      }
      configByKey.set(key, entry);
    }

    const opticalByKey = new Map<string, { rx?: number | null; tx?: number | null }>();
    for (const row of opticalRows) {
      const suffix = row.oid.replace(`${CDATA_SNMP.gponOnuOpticalTable}.`, '');
      const parts = suffix.split('.');
      if (parts.length < 5) continue;
      const column = Number(parts[parts.length - 1]);
      const key = parts.slice(0, -1).join('.');
      const entry = opticalByKey.get(key) ?? {};
      if (column === CDATA_SNMP.gponOnuOpticalRxPower) {
        entry.rx = parseOpticalPowerDbm(row.value);
      }
      if (column === CDATA_SNMP.gponOnuOpticalTxPower) {
        entry.tx = parseOpticalPowerDbm(row.value);
      }
      opticalByKey.set(key, entry);
    }

    const readings: OnuSnmpReading[] = [];
    for (const [key, cfg] of configByKey.entries()) {
      const optical = opticalByKey.get(key);
      if (!cfg.onuId && !cfg.serial) continue;
      readings.push({
        ponPort: cfg.ponPort ?? 'unknown',
        onuId: cfg.onuId ?? key.split('.').pop() ?? 'unknown',
        serialNumber: cfg.serial,
        rxPower: optical?.rx ?? null,
        txPower: optical?.tx ?? null,
        status: optical?.rx != null ? 'online' : 'pending',
      });
    }

    if (readings.length > 0) return readings;

    const eponRows = await this.snmpClient.walk(config, CDATA_SNMP.eponOnuTable);
    const eponByIndex = new Map<string, Partial<OnuSnmpReading>>();
    for (const row of eponRows) {
      const suffix = row.oid.replace(`${CDATA_SNMP.eponOnuTable}.`, '');
      const parts = suffix.split('.');
      const column = Number(parts[parts.length - 1]);
      const index = parts.slice(0, -1).join('.');
      const entry = eponByIndex.get(index) ?? {};
      if (column === CDATA_SNMP.eponOnuId) entry.onuId = String(row.value ?? '');
      if (column === CDATA_SNMP.eponOnuSerial) entry.serialNumber = String(row.value ?? '');
      if (column === CDATA_SNMP.eponOnuRxPower) {
        const raw = parseInteger(row.value);
        entry.rxPower = raw != null ? raw / 100 : null;
      }
      if (column === CDATA_SNMP.eponOnuTxPower) {
        const raw = parseInteger(row.value);
        entry.txPower = raw != null ? raw / 100 : null;
      }
      if (column === CDATA_SNMP.eponOnuRange) entry.distanceMeters = parseInteger(row.value);
      if (column === CDATA_SNMP.eponOnuOnlineStatus) {
        entry.status = Number(row.value) === 1 ? 'online' : 'offline';
      }
      eponByIndex.set(index, entry);
    }

    return [...eponByIndex.values()]
      .filter((entry) => entry.onuId || entry.serialNumber)
      .map((entry) => ({
        ponPort: entry.ponPort ?? 'epon',
        onuId: entry.onuId ?? 'unknown',
        serialNumber: entry.serialNumber,
        rxPower: entry.rxPower ?? null,
        txPower: entry.txPower ?? null,
        distanceMeters: entry.distanceMeters ?? null,
        status: entry.status ?? 'pending',
      }));
  }

  private async readVsolOnuTable(config: SnmpSessionConfig): Promise<OnuSnmpReading[]> {
    const rows = await this.snmpClient.walk(config, VSOL_SNMP.onuOpticalTable);
    const grouped = new Map<string, Partial<OnuSnmpReading>>();

    for (const row of rows) {
      const suffix = row.oid.replace(`${VSOL_SNMP.onuOpticalTable}.`, '');
      const parts = suffix.split('.');
      if (parts.length < 3) continue;
      const column = Number(parts[parts.length - 1]);
      const index = parts.slice(0, -1).join('.');
      const entry = grouped.get(index) ?? {};
      const ponPort = parts[0] ? `pon-${parts[0]}` : 'unknown';
      const onuId = parts[1] ?? 'unknown';
      entry.ponPort = ponPort;
      entry.onuId = onuId;

      if ([5, 7, 9, 10, 15, 16].includes(column)) {
        const dbm = parseOpticalPowerDbm(row.value);
        if (dbm != null) {
          if (column === 5 || column === 7) entry.txPower = dbm;
          else entry.rxPower = dbm;
        }
      }
      if (column === 1) entry.serialNumber = String(row.value ?? '').trim() || entry.serialNumber;
      if (column === 2) entry.onuId = String(row.value ?? entry.onuId);
      entry.status = entry.rxPower != null || entry.txPower != null ? 'online' : entry.status;
      grouped.set(index, entry);
    }

    return [...grouped.values()].map((entry) => ({
      ponPort: entry.ponPort ?? 'unknown',
      onuId: entry.onuId ?? 'unknown',
      serialNumber: entry.serialNumber,
      rxPower: entry.rxPower ?? null,
      txPower: entry.txPower ?? null,
      distanceMeters: entry.distanceMeters ?? null,
      status: entry.status ?? 'pending',
    }));
  }

  private timeticksToSeconds(value: unknown): number | null {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    return Math.floor(numeric / 100);
  }
}
