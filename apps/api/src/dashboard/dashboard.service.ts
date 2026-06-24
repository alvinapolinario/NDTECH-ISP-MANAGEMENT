import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { money } from '../reports/reports.utils';
import { DashboardAnalyticsQueryDto } from './dto/dashboard-analytics-query.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getAnalytics(query: DashboardAnalyticsQueryDto) {
    const billingCycle = await this.resolveBillingCycle(query.billingCycleId);
    const cycleInvoiceWhere = {
      deletedAt: null,
      billingCycleId: billingCycle.id,
      status: { notIn: ['draft', 'cancelled'] as Array<'draft' | 'cancelled'> },
    };

    const [
      totalActiveClients,
      clientsWithOverdue,
      cycleInvoiceAgg,
      onlineSessions,
      activeWithPppoe,
      revenueCycles,
    ] = await Promise.all([
      this.prisma.subscription.count({ where: { status: 'active' } }),
      this.prisma.invoice.groupBy({
        by: ['customerId'],
        where: {
          deletedAt: null,
          status: 'overdue',
        },
      }),
      this.prisma.invoice.aggregate({
        where: cycleInvoiceWhere,
        _sum: {
          total: true,
          amountPaid: true,
          balance: true,
        },
      }),
      this.prisma.pppoeSession.findMany({
        where: { status: 'online' },
        select: { pppoeAccountId: true, username: true },
      }),
      this.prisma.subscription.count({
        where: {
          status: 'active',
          pppoeAccountId: { not: null },
        },
      }),
      this.prisma.billingCycle.findMany({
        where: { deletedAt: null },
        orderBy: { periodStart: 'desc' },
        take: 6,
        select: {
          id: true,
          name: true,
          periodStart: true,
          periodEnd: true,
        },
      }),
    ]);

    const onlineAccountIds = new Set(
      onlineSessions
        .map((session) => session.pppoeAccountId)
        .filter((id): id is number => id !== null),
    );
    const onlineClients = onlineAccountIds.size;
    const offlineClients = Math.max(activeWithPppoe - onlineClients, 0);

    const revenueSeries = await Promise.all(
      [...revenueCycles].reverse().map(async (cycle) => {
        const aggregate = await this.prisma.invoice.aggregate({
          where: {
            deletedAt: null,
            billingCycleId: cycle.id,
            status: { notIn: ['draft', 'cancelled'] as Array<'draft' | 'cancelled'> },
          },
          _sum: {
            total: true,
            amountPaid: true,
            balance: true,
          },
        });

        const collectable = aggregate._sum.total ?? new Prisma.Decimal(0);
        const collected = aggregate._sum.amountPaid ?? new Prisma.Decimal(0);
        const uncollected = aggregate._sum.balance ?? new Prisma.Decimal(0);

        return {
          billingCycleId: cycle.id,
          label: cycle.name,
          periodStart: cycle.periodStart,
          periodEnd: cycle.periodEnd,
          collectable: money(collectable),
          collected: money(collected),
          uncollected: money(uncollected),
        };
      }),
    );

    return {
      billingCycle: {
        id: billingCycle.id,
        name: billingCycle.name,
        periodStart: billingCycle.periodStart,
        periodEnd: billingCycle.periodEnd,
        dueDate: billingCycle.dueDate,
        status: billingCycle.status,
      },
      metrics: {
        totalActiveClients,
        clientsWithOverdue: clientsWithOverdue.length,
        collectedAmount: money(cycleInvoiceAgg._sum?.amountPaid),
        totalCollectable: money(cycleInvoiceAgg._sum?.total),
        totalUncollected: money(cycleInvoiceAgg._sum?.balance),
        onlineClients,
        offlineClients,
      },
      revenueSeries,
      generatedAt: new Date().toISOString(),
    };
  }

  private async resolveBillingCycle(billingCycleId?: number) {
    if (billingCycleId) {
      const cycle = await this.prisma.billingCycle.findFirst({
        where: { id: billingCycleId, deletedAt: null },
      });

      if (!cycle) {
        throw new NotFoundException('Billing cycle not found');
      }

      return cycle;
    }

    const latest = await this.prisma.billingCycle.findFirst({
      where: { deletedAt: null },
      orderBy: { periodStart: 'desc' },
    });

    if (!latest) {
      throw new NotFoundException(
        'No billing cycles found. Create a billing cycle first.',
      );
    }

    return latest;
  }
}
