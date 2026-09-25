import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CollectorRemittanceStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { getPagination } from '../common/pagination';
import {
  ADMIN_PORTAL_ROLES,
  assertActiveStaffRole,
  STAFF_ROLES,
  SUPER_ADMIN_ROLE,
} from '../common/staff-role';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCollectorRemittanceDto } from './dto/create-collector-remittance.dto';
import {
  ListCollectorRemittancesQueryDto,
  PreviewCollectorRemittanceQueryDto,
} from './dto/list-collector-remittances-query.dto';

@Injectable()
export class CollectorRemittancesService {
  constructor(private readonly prisma: PrismaService) {}

  async preview(
    query: PreviewCollectorRemittanceQueryDto,
    actor: AuthenticatedUser,
  ) {
    this.assertFinanceOrAdmin(actor);
    await assertActiveStaffRole(
      this.prisma,
      query.collectorUserId,
      STAFF_ROLES.COLLECTOR,
    );

    const period = this.resolvePeriod(query.from, query.to);
    const cash = await this.sumCashCollected(
      query.collectorUserId,
      period.start,
      period.paymentEnd,
    );

    return {
      collectorUserId: query.collectorUserId,
      periodStart: period.start.toISOString().slice(0, 10),
      periodEnd: period.end.toISOString().slice(0, 10),
      paymentCount: cash.paymentCount,
      expectedAmount: cash.expectedAmount.toFixed(2),
    };
  }

  async create(dto: CreateCollectorRemittanceDto, actor: AuthenticatedUser) {
    this.assertFinanceOrAdmin(actor);
    await assertActiveStaffRole(
      this.prisma,
      dto.collectorUserId,
      STAFF_ROLES.COLLECTOR,
    );

    if (new Date(dto.periodStart) > new Date(dto.periodEnd)) {
      throw new BadRequestException('periodStart must be on or before periodEnd');
    }

    const period = this.resolvePeriod(dto.periodStart, dto.periodEnd);
    await this.assertNoOverlappingRemittance(
      dto.collectorUserId,
      period.start,
      period.end,
    );

    const cash = await this.sumCashCollected(
      dto.collectorUserId,
      period.start,
      period.paymentEnd,
    );
    const cashReceivedAmount = Number(dto.cashReceivedAmount);
    const variance = cashReceivedAmount - cash.expectedAmount;
    const remittanceDate = dto.remittanceDate
      ? new Date(dto.remittanceDate)
      : new Date();

    return this.prisma.collectorRemittance.create({
      data: {
        remittanceNumber: await this.nextRemittanceNumber(remittanceDate),
        collectorUserId: dto.collectorUserId,
        receivedByUserId: actor.id,
        periodStart: period.start,
        periodEnd: period.end,
        expectedAmount: cash.expectedAmount,
        cashReceivedAmount,
        variance,
        notes: dto.notes?.trim() || null,
        remittanceDate,
        status: CollectorRemittanceStatus.recorded,
      },
      include: this.includeRelations(),
    });
  }

  async findAll(
    query: ListCollectorRemittancesQueryDto,
    actor: AuthenticatedUser,
  ) {
    this.assertFinanceOrAdmin(actor);
    const { page, limit, skip } = getPagination(query);
    const search = query.search?.trim();
    const status =
      query.status ?? (query.filter as CollectorRemittanceStatus | undefined);

    const where: Prisma.CollectorRemittanceWhereInput = {
      ...(status ? { status } : {}),
      ...(query.collectorUserId
        ? { collectorUserId: query.collectorUserId }
        : {}),
      ...(query.from || query.to
        ? {
            remittanceDate: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(`${query.to}T23:59:59.999`) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { remittanceNumber: { contains: search } },
              { notes: { contains: search } },
              { collector: { name: { contains: search } } },
              { receivedBy: { name: { contains: search } } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.collectorRemittance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { remittanceDate: 'desc' },
        include: this.includeRelations(),
      }),
      this.prisma.collectorRemittance.count({ where }),
    ]);

    return {
      items: items.map((item) => this.serialize(item)),
      meta: { total, page, limit },
    };
  }

  async findOne(id: number, actor: AuthenticatedUser) {
    this.assertFinanceOrAdmin(actor);
    const item = await this.prisma.collectorRemittance.findUnique({
      where: { id },
      include: this.includeRelations(),
    });

    if (!item) {
      throw new NotFoundException('Remittance not found');
    }

    return this.serialize(item);
  }

  async void(id: number, actor: AuthenticatedUser) {
    this.assertFinanceOrAdmin(actor);
    const current = await this.findOne(id, actor);

    if (current.status === CollectorRemittanceStatus.voided) {
      throw new BadRequestException('Remittance is already voided');
    }

    const item = await this.prisma.collectorRemittance.update({
      where: { id },
      data: { status: CollectorRemittanceStatus.voided },
      include: this.includeRelations(),
    });

    return this.serialize(item);
  }

  private async sumCashCollected(
    collectorUserId: number,
    periodStart: Date,
    periodEnd: Date,
  ) {
    const payments = await this.prisma.payment.findMany({
      where: {
        deletedAt: null,
        status: PaymentStatus.posted,
        paymentMethod: PaymentMethod.cash,
        collectorUserId,
        paymentDate: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      select: { amount: true },
    });

    const expectedAmount = payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0,
    );

    return {
      paymentCount: payments.length,
      expectedAmount,
    };
  }

  private resolvePeriod(from: string, to: string) {
    const start = new Date(`${from}T00:00:00.000`);
    const end = new Date(`${to}T00:00:00.000`);
    return {
      start,
      end,
      // Inclusive end-of-day for DateTime comparisons against paymentDate.
      paymentEnd: new Date(`${to}T23:59:59.999`),
    };
  }

  private async assertNoOverlappingRemittance(
    collectorUserId: number,
    periodStart: Date,
    periodEnd: Date,
    excludeId?: number,
  ) {
    const overlap = await this.prisma.collectorRemittance.findFirst({
      where: {
        collectorUserId,
        status: CollectorRemittanceStatus.recorded,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        periodStart: { lte: periodEnd },
        periodEnd: { gte: periodStart },
      },
      select: { id: true, remittanceNumber: true },
    });

    if (overlap) {
      throw new BadRequestException(
        `Collector already has remittance ${overlap.remittanceNumber} overlapping this period`,
      );
    }
  }

  private async nextRemittanceNumber(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const prefix = `REM-${year}${month}`;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const count = await this.prisma.collectorRemittance.count({
        where: { remittanceNumber: { startsWith: prefix } },
      });
      const candidate = `${prefix}-${String(count + 1 + attempt).padStart(4, '0')}`;
      const exists = await this.prisma.collectorRemittance.findUnique({
        where: { remittanceNumber: candidate },
        select: { id: true },
      });
      if (!exists) return candidate;
    }

    return `${prefix}-${Date.now()}`;
  }

  private assertFinanceOrAdmin(user: AuthenticatedUser) {
    const allowed = user.roles.some(
      (role) =>
        ADMIN_PORTAL_ROLES.has(role.name) ||
        role.name === STAFF_ROLES.FINANCE ||
        role.name === SUPER_ADMIN_ROLE,
    );

    if (!allowed) {
      throw new ForbiddenException(
        'Only Finance or Admin users can record remittances',
      );
    }
  }

  private includeRelations() {
    return {
      collector: {
        select: { id: true, name: true, email: true },
      },
      receivedBy: {
        select: { id: true, name: true, email: true },
      },
    };
  }

  private serialize(
    item: Prisma.CollectorRemittanceGetPayload<{
      include: ReturnType<CollectorRemittancesService['includeRelations']>;
    }>,
  ) {
    return {
      ...item,
      expectedAmount: Number(item.expectedAmount).toFixed(2),
      cashReceivedAmount: Number(item.cashReceivedAmount).toFixed(2),
      variance: Number(item.variance).toFixed(2),
      periodStart: item.periodStart.toISOString().slice(0, 10),
      periodEnd: item.periodEnd.toISOString().slice(0, 10),
      remittanceDate: item.remittanceDate.toISOString().slice(0, 10),
    };
  }
}
