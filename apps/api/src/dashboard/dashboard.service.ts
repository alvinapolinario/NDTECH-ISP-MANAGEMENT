import { Injectable, NotFoundException } from '@nestjs/common';
import { Customer, CustomerAddress, Prisma } from '@prisma/client';
import { PppoeSessionsService } from '../mikrotik/pppoe-sessions.service';
import { PrismaService } from '../prisma/prisma.service';
import { RadiusSessionMonitorService } from '../radius/radius-session-monitor.service';
import { money } from '../reports/reports.utils';
import { DashboardAnalyticsQueryDto } from './dto/dashboard-analytics-query.dto';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pppoeSessions: PppoeSessionsService,
    private readonly radiusSessionMonitor: RadiusSessionMonitorService,
  ) {}

  async getAnalytics(query: DashboardAnalyticsQueryDto) {
    const billingCycle = await this.resolveBillingCycle(query.billingCycleId);

    if (!billingCycle) {
      return this.buildEmptyAnalytics();
    }

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
      onlinePppoeSummary,
      topBandwidthClients,
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
        select: { pppoeAccountId: true },
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
      this.pppoeSessions.getOnlineSummary(),
      this.getTopBandwidthClients(),
    ]);

    const onlineAccountIds = new Set(
      onlineSessions
        .map((session) => session.pppoeAccountId)
        .filter((id): id is number => id !== null),
    );
    const offlineClients = Math.max(activeWithPppoe - onlineAccountIds.size, 0);

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
        onlineClients: onlinePppoeSummary.totalOnline,
        offlineClients,
      },
      onlinePppoeSummary,
      topBandwidthClients,
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

    return this.prisma.billingCycle.findFirst({
      where: { deletedAt: null },
      orderBy: { periodStart: 'desc' },
    });
  }

  private async buildEmptyAnalytics() {
    const [
      totalActiveClients,
      clientsWithOverdue,
      onlineSessions,
      activeWithPppoe,
      onlinePppoeSummary,
      topBandwidthClients,
    ] = await Promise.all([
      this.prisma.subscription.count({ where: { status: 'active' } }),
      this.prisma.invoice.groupBy({
        by: ['customerId'],
        where: {
          deletedAt: null,
          status: 'overdue',
        },
      }),
      this.prisma.pppoeSession.findMany({
        where: { status: 'online' },
        select: { pppoeAccountId: true },
      }),
      this.prisma.subscription.count({
        where: {
          status: 'active',
          pppoeAccountId: { not: null },
        },
      }),
      this.pppoeSessions.getOnlineSummary(),
      this.getTopBandwidthClients(),
    ]);

    const onlineAccountIds = new Set(
      onlineSessions
        .map((session) => session.pppoeAccountId)
        .filter((id): id is number => id !== null),
    );
    const offlineClients = Math.max(activeWithPppoe - onlineAccountIds.size, 0);

    return {
      billingCycle: null,
      metrics: {
        totalActiveClients,
        clientsWithOverdue: clientsWithOverdue.length,
        collectedAmount: money(new Prisma.Decimal(0)),
        totalCollectable: money(new Prisma.Decimal(0)),
        totalUncollected: money(new Prisma.Decimal(0)),
        onlineClients: onlinePppoeSummary.totalOnline,
        offlineClients,
      },
      onlinePppoeSummary,
      topBandwidthClients,
      revenueSeries: [],
      generatedAt: new Date().toISOString(),
    };
  }

  private async getTopBandwidthClients(limit = 10) {
    const usageRows =
      await this.radiusSessionMonitor.getAggregatedTopBandwidthUsers(limit);

    if (usageRows.length) {
      return this.enrichBandwidthClients(usageRows);
    }

    return this.getTopBandwidthClientsFromMikrotik(limit);
  }

  private async enrichBandwidthClients(
    usageRows: Array<{
      username: string;
      uploadBytes: string;
      downloadBytes: string;
      totalBytes: string;
    }>,
  ) {
    const usernames = usageRows.map((row) => row.username);
    const accounts = await this.prisma.pppoeAccount.findMany({
      where: { username: { in: usernames } },
      include: {
        customer: {
          include: {
            addresses: true,
          },
        },
      },
    });

    const accountByUsername = new Map(
      accounts.map((account) => [account.username, account]),
    );

    return usageRows.map((row, index) => {
      const account = accountByUsername.get(row.username);
      const customer = account?.customer ?? null;

      return {
        rank: index + 1,
        username: row.username,
        customerName: customer ? this.customerDisplayName(customer) : row.username,
        barangay: customer
          ? this.resolveBarangay(customer.addresses)
          : 'Unknown',
        uploadBytes: row.uploadBytes,
        downloadBytes: row.downloadBytes,
        totalBytes: row.totalBytes,
      };
    });
  }

  private async getTopBandwidthClientsFromMikrotik(limit = 10) {
    const sessions = await this.prisma.pppoeSession.findMany({
      where: { status: 'online' },
      include: {
        pppoeAccount: {
          include: {
            customer: {
              include: {
                addresses: true,
              },
            },
          },
        },
      },
    });

    const aggregated = new Map<
      string,
      {
        username: string;
        customer: Customer | null;
        addresses: CustomerAddress[];
        uploadBytes: bigint;
        downloadBytes: bigint;
        totalBytes: bigint;
      }
    >();

    for (const session of sessions) {
      const uploadBytes = BigInt(session.rxBytes);
      const downloadBytes = BigInt(session.txBytes);
      const totalBytes = uploadBytes + downloadBytes;
      const key = session.username.toLowerCase();
      const customer = session.pppoeAccount?.customer ?? null;
      const current = aggregated.get(key);

      if (current) {
        current.uploadBytes += uploadBytes;
        current.downloadBytes += downloadBytes;
        current.totalBytes += totalBytes;
        current.customer = current.customer ?? customer;
        if (!current.addresses.length && customer?.addresses.length) {
          current.addresses = customer.addresses;
        }
        continue;
      }

      aggregated.set(key, {
        username: session.username,
        customer,
        addresses: customer?.addresses ?? [],
        uploadBytes,
        downloadBytes,
        totalBytes,
      });
    }

    return [...aggregated.values()]
      .sort((left, right) => {
        if (left.totalBytes === right.totalBytes) {
          return left.username.localeCompare(right.username);
        }

        return left.totalBytes > right.totalBytes ? -1 : 1;
      })
      .slice(0, limit)
      .map((entry, index) => ({
        rank: index + 1,
        username: entry.username,
        customerName: entry.customer
          ? this.customerDisplayName(entry.customer)
          : entry.username,
        barangay: entry.customer
          ? this.resolveBarangay(entry.addresses)
          : 'Unknown',
        uploadBytes: entry.uploadBytes.toString(),
        downloadBytes: entry.downloadBytes.toString(),
        totalBytes: entry.totalBytes.toString(),
      }))
      .filter((entry) => BigInt(entry.totalBytes) > 0n);
  }

  private customerDisplayName(customer: Customer) {
    const businessName = customer.businessName?.trim();
    if (businessName) {
      return businessName;
    }

    const fullName = [customer.firstName, customer.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    return fullName || customer.accountNumber;
  }

  private resolveBarangay(addresses: CustomerAddress[]) {
    const installation = addresses.find(
      (address) => address.addressType === 'installation',
    );
    const billing = addresses.find(
      (address) => address.addressType === 'billing',
    );

    return (
      installation?.barangay?.trim() ||
      billing?.barangay?.trim() ||
      addresses[0]?.barangay?.trim() ||
      'Unknown'
    );
  }
}
