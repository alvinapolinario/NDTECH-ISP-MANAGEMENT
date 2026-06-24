import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OltDevicesSnmpService } from '../olt-devices/olt-devices-snmp.service';

@Injectable()
export class OnuDevicesSnmpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly oltSnmp: OltDevicesSnmpService,
  ) {}

  async pollDevice(id: number) {
    const onu = await this.prisma.onuDevice.findFirst({
      where: { id, deletedAt: null },
      include: { oltDevice: true },
    });
    if (!onu) throw new NotFoundException('ONU device not found');
    if (!onu.oltDevice || onu.oltDevice.deletedAt) {
      throw new BadRequestException('Parent OLT is missing or deleted');
    }

    const oltPoll = await this.oltSnmp.pollDevice(onu.oltDeviceId, { syncOnus: true });
    const updated = await this.prisma.onuDevice.findFirst({
      where: { id, deletedAt: null },
      include: {
        oltDevice: { select: { id: true, name: true, host: true, vendor: true } },
      },
    });

    return {
      onuDeviceId: id,
      oltDeviceId: onu.oltDeviceId,
      oltPoll,
      onu: updated,
    };
  }

  async listSignalLogs(id: number, limit = 50) {
    await this.ensureOnu(id);
    return this.prisma.onuSignalLog.findMany({
      where: { onuDeviceId: id },
      orderBy: { polledAt: 'desc' },
      take: limit,
    });
  }

  private async ensureOnu(id: number) {
    const onu = await this.prisma.onuDevice.findFirst({
      where: { id, deletedAt: null },
    });
    if (!onu) throw new NotFoundException('ONU device not found');
    return onu;
  }
}
