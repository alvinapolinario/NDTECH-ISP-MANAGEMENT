import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { NetworkMonitorDeviceType, NetworkMonitorStatus, Prisma } from '@prisma/client';
import { getPagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNetworkMonitoringTargetDto } from './dto/create-network-monitoring-target.dto';
import { ListNetworkMonitoringTargetsQueryDto } from './dto/list-network-monitoring-targets-query.dto';
import { RecordNetworkMonitoringCheckDto } from './dto/record-network-monitoring-check.dto';
import { UpdateNetworkMonitoringTargetDto } from './dto/update-network-monitoring-target.dto';

@Injectable()
export class NetworkMonitoringService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateNetworkMonitoringTargetDto) {
    try {
      return await this.prisma.networkMonitoringTarget.create({
        data: this.toTargetCreateData(dto),
        include: this.includeRelations(),
      });
    } catch (error) {
      this.rethrowUniqueConflict(error);
    }
  }

  async findAll(query: ListNetworkMonitoringTargetsQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const status = query.status ?? (query.filter as NetworkMonitorStatus | undefined);
    const search = query.search?.trim();

    const where: Prisma.NetworkMonitoringTargetWhereInput = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(query.deviceType
        ? { deviceType: query.deviceType as NetworkMonitorDeviceType }
        : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { host: { contains: search } },
              { location: { contains: search } },
              { notes: { contains: search } },
              { interfaceStatus: { contains: search } },
              { mikrotikRouter: { name: { contains: search } } },
              { oltDevice: { name: { contains: search } } },
              { onuDevice: { serialNumber: { contains: search } } },
              { onuDevice: { name: { contains: search } } },
            ],
          }
        : {}),
    };

    const [items, total, summary] = await this.prisma.$transaction([
      this.prisma.networkMonitoringTarget.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: this.includeRelations(),
      }),
      this.prisma.networkMonitoringTarget.count({ where }),
      this.prisma.networkMonitoringTarget.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
    ]);

    return {
      items,
      meta: { total, page, limit },
      summary: this.formatSummary(summary),
    };
  }

  async findOne(id: number) {
    const target = await this.prisma.networkMonitoringTarget.findFirst({
      where: { id, deletedAt: null },
      include: {
        ...this.includeRelations(),
        checks: { orderBy: { checkedAt: 'desc' }, take: 20 },
      },
    });

    if (!target) throw new NotFoundException('Monitoring target not found');
    return target;
  }

  async update(id: number, dto: UpdateNetworkMonitoringTargetDto) {
    await this.findOne(id);
    try {
      return await this.prisma.networkMonitoringTarget.update({
        where: { id },
        data: this.toTargetUpdateData(dto),
        include: this.includeRelations(),
      });
    } catch (error) {
      this.rethrowUniqueConflict(error);
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.networkMonitoringTarget.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: this.includeRelations(),
    });
  }

  async recordCheck(id: number, dto: RecordNetworkMonitoringCheckDto) {
    await this.findOne(id);
    const checkedAt = dto.checkedAt ? new Date(dto.checkedAt) : new Date();

    const [check, target] = await this.prisma.$transaction([
      this.prisma.networkMonitoringCheck.create({
        data: {
          ...this.toCheckData(dto),
          targetId: id,
          checkedAt,
        },
      }),
      this.prisma.networkMonitoringTarget.update({
        where: { id },
        data: {
          ...this.toCheckData(dto),
          lastCheckedAt: checkedAt,
        },
        include: this.includeRelations(),
      }),
    ]);

    return { check, target };
  }

  private toTargetCreateData(
    dto: CreateNetworkMonitoringTargetDto,
  ): Prisma.NetworkMonitoringTargetUncheckedCreateInput {
    return {
      ...dto,
      lastCheckedAt: this.toDateOrNull(dto.lastCheckedAt),
    };
  }

  private toTargetUpdateData(
    dto: UpdateNetworkMonitoringTargetDto,
  ): Prisma.NetworkMonitoringTargetUncheckedUpdateInput {
    return {
      ...dto,
      lastCheckedAt: this.toDateOrNull(dto.lastCheckedAt),
    };
  }

  private toCheckData(
    dto: RecordNetworkMonitoringCheckDto,
  ): Omit<Prisma.NetworkMonitoringCheckUncheckedCreateInput, 'targetId' | 'checkedAt'> {
    return {
      status: dto.status,
      latencyMs: dto.latencyMs,
      packetLossPercent: dto.packetLossPercent,
      uptimeSeconds: dto.uptimeSeconds,
      cpuUsagePercent: dto.cpuUsagePercent,
      memoryUsagePercent: dto.memoryUsagePercent,
      interfaceStatus: dto.interfaceStatus,
      interfaceErrors: dto.interfaceErrors,
      notes: dto.notes,
    };
  }

  private toDateOrNull(value?: string | null) {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    return new Date(value);
  }

  private includeRelations() {
    return {
      mikrotikRouter: {
        select: { id: true, name: true, host: true, status: true },
      },
      oltDevice: {
        select: { id: true, name: true, host: true, status: true },
      },
      onuDevice: {
        select: {
          id: true,
          name: true,
          serialNumber: true,
          ponPort: true,
          onuId: true,
          status: true,
        },
      },
      _count: { select: { checks: true } },
    };
  }

  private formatSummary(
    summary: Array<{
      status: NetworkMonitorStatus;
      _count?: true | { _all?: number };
    }>,
  ) {
    return summary.reduce(
      (acc, item) => {
        const count = typeof item._count === 'object' ? (item._count._all ?? 0) : 0;
        return {
          ...acc,
          [item.status]: count,
          total: acc.total + count,
        };
      },
      { total: 0, online: 0, degraded: 0, offline: 0, unknown: 0 },
    );
  }

  private rethrowUniqueConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Monitoring target already exists for this device type and host');
    }
    throw error;
  }
}
