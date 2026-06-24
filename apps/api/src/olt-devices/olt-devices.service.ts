import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { OltDeviceStatus, OltPonTechnology, Prisma } from '@prisma/client';
import { getPagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOltDeviceDto } from './dto/create-olt-device.dto';
import { ListOltDevicesQueryDto } from './dto/list-olt-devices-query.dto';
import { UpdateOltDeviceDto } from './dto/update-olt-device.dto';

@Injectable()
export class OltDevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOltDeviceDto) {
    try {
      return await this.prisma.oltDevice.create({ data: dto });
    } catch (error) {
      this.rethrowUniqueHostConflict(error);
    }
  }

  async findAll(query: ListOltDevicesQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const status = query.status ?? (query.filter as OltDeviceStatus | undefined);
    const search = query.search?.trim();

    const where = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(query.ponTechnology ? { ponTechnology: query.ponTechnology as OltPonTechnology } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { vendor: { contains: search } },
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
      this.prisma.oltDevice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.oltDevice.count({ where }),
    ]);

    return { items, meta: { total, page, limit } };
  }

  async findOne(id: number) {
    const device = await this.prisma.oltDevice.findFirst({
      where: { id, deletedAt: null },
    });
    if (!device) throw new NotFoundException('OLT device not found');
    return device;
  }

  async update(id: number, dto: UpdateOltDeviceDto) {
    await this.findOne(id);
    try {
      return await this.prisma.oltDevice.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      this.rethrowUniqueHostConflict(error);
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.oltDevice.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private rethrowUniqueHostConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('OLT host already exists');
    }
    throw error;
  }
}
