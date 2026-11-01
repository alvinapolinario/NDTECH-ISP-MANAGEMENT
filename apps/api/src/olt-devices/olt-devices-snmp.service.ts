import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OnuDeviceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SnmpClientService } from '../snmp/snmp-client.service';
import { SnmpPollingService } from '../snmp/snmp-polling.service';
import type { OnuSnmpReading } from '../snmp/snmp.types';

@Injectable()
export class OltDevicesSnmpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snmpClient: SnmpClientService,
    private readonly snmpPolling: SnmpPollingService,
  ) {}

  async testSnmp(id: number) {
    const device = await this.getDevice(id);
    this.snmpClient.assertV2cOnly(device.snmpVersion);
    const community = this.requireCommunity(device.snmpCommunity);
    const result = await this.snmpPolling.testConnection({
      host: device.host,
      port: device.snmpPort,
      community,
    });
    return { deviceId: id, ...result };
  }

  async pollDevice(id: number, options: { syncOnus?: boolean } = {}) {
    const device = await this.getDevice(id);
    this.snmpClient.assertV2cOnly(device.snmpVersion);
    const community = this.requireCommunity(device.snmpCommunity);

    const result = await this.snmpPolling.pollOlt(device.vendor, {
      host: device.host,
      port: device.snmpPort,
      community,
    });

    let onuUpdated = 0;
    if (result.success && options.syncOnus !== false && result.onuReadings.length > 0) {
      onuUpdated = await this.syncOnuReadings(id, result.onuReadings);
    }

    if (result.success) {
      await this.prisma.oltDevice.update({
        where: { id },
        data: {
          sysDescr: result.sysDescr,
          sysName: result.sysName,
          uptimeSeconds: result.uptimeSeconds,
          lastPolledAt: new Date(),
        },
      });
    }

    return { ...result, deviceId: id, onuUpdated };
  }

  private async syncOnuReadings(oltDeviceId: number, readings: OnuSnmpReading[]) {
    const onus = await this.prisma.onuDevice.findMany({
      where: { oltDeviceId, deletedAt: null },
    });
    let updated = 0;

    for (const reading of readings) {
      const match = onus.find(
        (onu) =>
          this.matchesOnu(onu, reading) ||
          (reading.serialNumber &&
            onu.serialNumber.toLowerCase() === reading.serialNumber.toLowerCase()),
      );
      if (!match) continue;

      const status = this.mapOnuStatus(reading);
      await this.prisma.$transaction([
        this.prisma.onuDevice.update({
          where: { id: match.id },
          data: {
            rxPower: reading.rxPower ?? undefined,
            txPower: reading.txPower ?? undefined,
            distanceMeters: reading.distanceMeters ?? undefined,
            status,
            lastPolledAt: new Date(),
          },
        }),
        this.prisma.onuSignalLog.create({
          data: {
            onuDeviceId: match.id,
            rxPower: reading.rxPower,
            txPower: reading.txPower,
            distanceMeters: reading.distanceMeters ?? null,
          },
        }),
      ]);
      updated += 1;
    }

    return updated;
  }

  private matchesOnu(
    onu: { ponPort: string; onuId: string },
    reading: OnuSnmpReading,
  ) {
    const ponMatch =
      onu.ponPort.toLowerCase() === reading.ponPort.toLowerCase() ||
      onu.ponPort.replace(/\D/g, '') === reading.ponPort.replace(/\D/g, '');
    const onuMatch = onu.onuId === reading.onuId;
    return ponMatch && onuMatch;
  }

  private mapOnuStatus(reading: OnuSnmpReading): OnuDeviceStatus {
    if (reading.status) return reading.status;
    if (reading.rxPower != null && reading.rxPower <= -28) return 'los';
    if (reading.rxPower != null) return 'online';
    return 'offline';
  }

  private requireCommunity(community: string | null | undefined) {
    if (!community?.trim()) {
      throw new BadRequestException('SNMP community is required on this OLT');
    }
    return community.trim();
  }

  private async getDevice(id: number) {
    const device = await this.prisma.oltDevice.findFirst({
      where: { id, deletedAt: null },
    });
    if (!device) throw new NotFoundException('OLT device not found');
    return device;
  }
}
