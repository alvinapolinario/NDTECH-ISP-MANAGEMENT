import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SnmpClientService } from '../snmp/snmp-client.service';
import { SnmpPollingService } from '../snmp/snmp-polling.service';

@Injectable()
export class SwitchDevicesSnmpService {
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

  async pollDevice(id: number) {
    const device = await this.getDevice(id);
    this.snmpClient.assertV2cOnly(device.snmpVersion);
    const community = this.requireCommunity(device.snmpCommunity);

    const result = await this.snmpPolling.pollSwitch(device.vendor, {
      host: device.host,
      port: device.snmpPort,
      community,
    });

    if (result.success) {
      await this.prisma.switchDevice.update({
        where: { id },
        data: {
          sysDescr: result.sysDescr,
          sysName: result.sysName,
          uptimeSeconds: result.uptimeSeconds,
          cpuUsagePercent: result.cpuUsagePercent,
          memoryUsagePercent: result.memoryUsagePercent,
          portCount: result.interfaces.total,
          portsUp: result.interfaces.up,
          lastPolledAt: new Date(),
        },
      });
    }

    return { deviceId: id, ...result };
  }

  private requireCommunity(community: string | null | undefined) {
    if (!community?.trim()) {
      throw new BadRequestException('SNMP community is required on this switch');
    }
    return community.trim();
  }

  private async getDevice(id: number) {
    const device = await this.prisma.switchDevice.findFirst({
      where: { id, deletedAt: null },
    });
    if (!device) throw new NotFoundException('Switch device not found');
    return device;
  }
}
