import { Injectable, NotFoundException } from '@nestjs/common';
import { NetworkAlertSeverity, NetworkAlertStatus, Prisma } from '@prisma/client';
import { getPagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { AcknowledgeNetworkAlertDto } from './dto/acknowledge-network-alert.dto';
import { CreateNetworkAlertDto } from './dto/create-network-alert.dto';
import { ListNetworkAlertsQueryDto } from './dto/list-network-alerts-query.dto';
import { ResolveNetworkAlertDto } from './dto/resolve-network-alert.dto';
import { UpdateNetworkAlertDto } from './dto/update-network-alert.dto';

@Injectable()
export class NetworkAlertsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateNetworkAlertDto) {
    return this.prisma.networkAlert.create({
      data: this.toCreateData(dto),
      include: this.includeRelations(),
    });
  }

  async findAll(query: ListNetworkAlertsQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const status = query.status ?? (query.filter as NetworkAlertStatus | undefined);
    const search = query.search?.trim();

    const where: Prisma.NetworkAlertWhereInput = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(query.severity ? { severity: query.severity as NetworkAlertSeverity } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search } },
              { description: { contains: search } },
              { metric: { contains: search } },
              { assignedTo: { contains: search } },
              { target: { name: { contains: search } } },
              { target: { host: { contains: search } } },
            ],
          }
        : {}),
    };

    const [items, total, statusSummary, severitySummary] = await this.prisma.$transaction([
      this.prisma.networkAlert.findMany({
        where,
        skip,
        take: limit,
        orderBy: { occurredAt: 'desc' },
        include: this.includeRelations(),
      }),
      this.prisma.networkAlert.count({ where }),
      this.prisma.networkAlert.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
      this.prisma.networkAlert.groupBy({
        by: ['severity'],
        where: { deletedAt: null, status: { in: ['open', 'acknowledged'] } },
        orderBy: { severity: 'asc' },
        _count: { _all: true },
      }),
    ]);

    return {
      items,
      meta: { total, page, limit },
      summary: {
        ...this.formatStatusSummary(statusSummary),
        severity: this.formatSeveritySummary(severitySummary),
      },
    };
  }

  async findOne(id: number) {
    const alert = await this.prisma.networkAlert.findFirst({
      where: { id, deletedAt: null },
      include: this.includeRelations(),
    });

    if (!alert) throw new NotFoundException('Network alert not found');
    return alert;
  }

  async update(id: number, dto: UpdateNetworkAlertDto) {
    await this.findOne(id);
    return this.prisma.networkAlert.update({
      where: { id },
      data: this.toUpdateData(dto),
      include: this.includeRelations(),
    });
  }

  async acknowledge(id: number, dto: AcknowledgeNetworkAlertDto) {
    await this.findOne(id);
    return this.prisma.networkAlert.update({
      where: { id },
      data: {
        status: 'acknowledged',
        acknowledgedBy: dto.acknowledgedBy || 'Operations',
        acknowledgedAt: new Date(),
      },
      include: this.includeRelations(),
    });
  }

  async resolve(id: number, dto: ResolveNetworkAlertDto) {
    await this.findOne(id);
    return this.prisma.networkAlert.update({
      where: { id },
      data: {
        status: 'resolved',
        resolvedBy: dto.resolvedBy || 'Operations',
        resolvedAt: new Date(),
        resolution: dto.resolution || null,
      },
      include: this.includeRelations(),
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.networkAlert.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: this.includeRelations(),
    });
  }

  private toCreateData(dto: CreateNetworkAlertDto): Prisma.NetworkAlertUncheckedCreateInput {
    return {
      ...dto,
      occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
    };
  }

  private toUpdateData(dto: UpdateNetworkAlertDto): Prisma.NetworkAlertUncheckedUpdateInput {
    return {
      ...dto,
      acknowledgedAt: this.toDateOrNull(dto.acknowledgedAt),
      resolvedAt: this.toDateOrNull(dto.resolvedAt),
      occurredAt: this.toDateOrUndefined(dto.occurredAt),
    };
  }

  private toDateOrNull(value?: string | null) {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    return new Date(value);
  }

  private toDateOrUndefined(value?: string | null) {
    if (value === undefined || value === null || value === '') return undefined;
    return new Date(value);
  }

  private includeRelations() {
    return {
      target: {
        select: {
          id: true,
          name: true,
          host: true,
          deviceType: true,
          status: true,
          location: true,
          mikrotikRouter: { select: { id: true, name: true, host: true } },
          oltDevice: { select: { id: true, name: true, host: true } },
          onuDevice: {
            select: {
              id: true,
              name: true,
              serialNumber: true,
              ponPort: true,
              onuId: true,
            },
          },
        },
      },
      check: {
        select: {
          id: true,
          status: true,
          latencyMs: true,
          packetLossPercent: true,
          checkedAt: true,
        },
      },
    };
  }

  private formatStatusSummary(
    summary: Array<{ status: NetworkAlertStatus; _count?: true | { _all?: number } }>,
  ) {
    return summary.reduce(
      (acc, item) => {
        const count = typeof item._count === 'object' ? (item._count._all ?? 0) : 0;
        return { ...acc, [item.status]: count, total: acc.total + count };
      },
      { total: 0, open: 0, acknowledged: 0, resolved: 0, dismissed: 0 },
    );
  }

  private formatSeveritySummary(
    summary: Array<{ severity: NetworkAlertSeverity; _count?: true | { _all?: number } }>,
  ) {
    return summary.reduce(
      (acc, item) => {
        const count = typeof item._count === 'object' ? (item._count._all ?? 0) : 0;
        return { ...acc, [item.severity]: count };
      },
      { info: 0, warning: 0, critical: 0 },
    );
  }
}
