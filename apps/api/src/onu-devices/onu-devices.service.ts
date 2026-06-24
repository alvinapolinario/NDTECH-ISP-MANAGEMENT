import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { OnuDeviceStatus, Prisma } from '@prisma/client';
import { getPagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOnuDeviceDto } from './dto/create-onu-device.dto';
import { ListOnuDevicesQueryDto } from './dto/list-onu-devices-query.dto';
import { UpdateOnuDeviceDto } from './dto/update-onu-device.dto';

@Injectable()
export class OnuDevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOnuDeviceDto) {
    try {
      return await this.prisma.onuDevice.create({
        data: this.toPrismaCreateData(dto),
        include: this.includeRelations(),
      });
    } catch (error) {
      this.rethrowUniqueConflict(error);
    }
  }

  async findAll(query: ListOnuDevicesQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const status = query.status ?? (query.filter as OnuDeviceStatus | undefined);
    const search = query.search?.trim();

    const where: Prisma.OnuDeviceWhereInput = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(query.oltDeviceId ? { oltDeviceId: query.oltDeviceId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.subscriptionId ? { subscriptionId: query.subscriptionId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { serialNumber: { contains: search } },
              { macAddress: { contains: search } },
              { ponPort: { contains: search } },
              { onuId: { contains: search } },
              { profileName: { contains: search } },
              { location: { contains: search } },
              { notes: { contains: search } },
              { oltDevice: { name: { contains: search } } },
              { customer: { accountNumber: { contains: search } } },
              { customer: { firstName: { contains: search } } },
              { customer: { lastName: { contains: search } } },
              { customer: { businessName: { contains: search } } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.onuDevice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.includeRelations(),
      }),
      this.prisma.onuDevice.count({ where }),
    ]);

    return { items, meta: { total, page, limit } };
  }

  async findOne(id: number) {
    const device = await this.prisma.onuDevice.findFirst({
      where: { id, deletedAt: null },
      include: this.includeRelations(),
    });

    if (!device) throw new NotFoundException('ONU device not found');
    return device;
  }

  async update(id: number, dto: UpdateOnuDeviceDto) {
    await this.findOne(id);
    try {
      return await this.prisma.onuDevice.update({
        where: { id },
        data: this.toPrismaUpdateData(dto),
        include: this.includeRelations(),
      });
    } catch (error) {
      this.rethrowUniqueConflict(error);
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.onuDevice.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: this.includeRelations(),
    });
  }

  private toPrismaCreateData(dto: CreateOnuDeviceDto): Prisma.OnuDeviceUncheckedCreateInput {
    return {
      ...dto,
      lastRegisteredAt: this.toDateOrNull(dto.lastRegisteredAt),
      lastDeregisteredAt: this.toDateOrNull(dto.lastDeregisteredAt),
    };
  }

  private toPrismaUpdateData(dto: UpdateOnuDeviceDto): Prisma.OnuDeviceUncheckedUpdateInput {
    return {
      ...dto,
      lastRegisteredAt: this.toDateOrNull(dto.lastRegisteredAt),
      lastDeregisteredAt: this.toDateOrNull(dto.lastDeregisteredAt),
    };
  }

  private toDateOrNull(value?: string | null) {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    return new Date(value);
  }

  private includeRelations() {
    return {
      oltDevice: {
        select: {
          id: true,
          name: true,
          host: true,
          ponTechnology: true,
          status: true,
        },
      },
      customer: {
        select: {
          id: true,
          accountNumber: true,
          firstName: true,
          lastName: true,
          businessName: true,
          mobileNumber: true,
          email: true,
          status: true,
        },
      },
      subscription: {
        select: {
          id: true,
          status: true,
          servicePlan: { select: { id: true, code: true, name: true } },
        },
      },
    };
  }

  private rethrowUniqueConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('ONU serial number or OLT port assignment already exists');
    }
    throw error;
  }
}
