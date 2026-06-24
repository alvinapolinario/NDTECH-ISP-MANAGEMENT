import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { OltDevicesSnmpService } from '../olt-devices/olt-devices-snmp.service';
import { SwitchDevicesSnmpService } from '../switch-devices/switch-devices-snmp.service';

@Injectable()
export class SnmpSchedulerService {
  private readonly logger = new Logger(SnmpSchedulerService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly oltSnmp: OltDevicesSnmpService,
    private readonly switchSnmp: SwitchDevicesSnmpService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async pollAllDevices() {
    if (process.env.SNMP_POLL_ENABLED === 'false') return;
    if (this.running) return;
    this.running = true;

    try {
      const [olts, switches] = await Promise.all([
        this.prisma.oltDevice.findMany({
          where: {
            deletedAt: null,
            status: 'active',
            snmpCommunity: { not: null },
            snmpVersion: 'v2c',
          },
          select: { id: true },
        }),
        this.prisma.switchDevice.findMany({
          where: {
            deletedAt: null,
            status: 'active',
            snmpCommunity: { not: null },
            snmpVersion: 'v2c',
          },
          select: { id: true },
        }),
      ]);

      for (const olt of olts) {
        try {
          await this.oltSnmp.pollDevice(olt.id, { syncOnus: true });
        } catch (error) {
          this.logger.warn(`Scheduled OLT poll failed for #${olt.id}: ${String(error)}`);
        }
      }

      for (const sw of switches) {
        try {
          await this.switchSnmp.pollDevice(sw.id);
        } catch (error) {
          this.logger.warn(`Scheduled switch poll failed for #${sw.id}: ${String(error)}`);
        }
      }
    } finally {
      this.running = false;
    }
  }
}
