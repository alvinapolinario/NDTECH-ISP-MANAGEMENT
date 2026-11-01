import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SwitchDeviceStatus, SwitchVendor } from '@prisma/client';
import { getPagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSwitchDeviceDto } from './dto/create-switch-device.dto';
import { ListSwitchDevicesQueryDto } from './dto/list-switch-devices-query.dto';
import { UpdateSwitchDeviceDto } from './dto/update-switch-device.dto';

@Injectable()
export class SwitchDevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSwitchDeviceDto) {
    try {
      return await this.prisma.switchDevice.create({ data: dto });
    } catch (error) {
      this.rethrowUniqueHostConflict(error);
    }
  }

  async findAll(query: ListSwitchDevicesQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const status = query.status ?? (query.filter as SwitchDeviceStatus | undefined);
    const search = query.search?.trim();

    const where = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(query.vendor ? { vendor: query.vendor as SwitchVendor } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { model: { contains: search } },
              { host: { contains: search } },
              { managementIp: { contains: search } },
              { location: { contains: search } },
              { notes: { contains: search } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.switchDevice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.switchDevice.count({ where }),
    ]);

    return { items, meta: { total, page, limit } };
  }

  async findOne(id: number) {
    const device = await this.prisma.switchDevice.findFirst({
      where: { id, deletedAt: null },
    });
    if (!device) throw new NotFoundException('Switch device not found');
    return device;
  }

  async update(id: number, dto: UpdateSwitchDeviceDto) {
    await this.findOne(id);
    try {
      return await this.prisma.switchDevice.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      this.rethrowUniqueHostConflict(error);
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.switchDevice.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private rethrowUniqueHostConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Switch host already exists');
    }
    throw error;
  }
}
