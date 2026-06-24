import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getPagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { ReportQueryDto } from './dto/report-query.dto';
import { money, monthRange, reportMeta } from './reports.utils';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async subscribers(query: ReportQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const status = query.filter as
      | 'active'
      | 'suspended'
      | 'cancelled'
      | 'terminated'
      | undefined;

    const where = {
      ...(status ? { status } : {}),
      ...(query.search
        ? {
            OR: [
              { customer: { accountNumber: { contains: query.search } } },
              { customer: { firstName: { contains: query.search } } },
              { customer: { lastName: { contains: query.search } } },
              { customer: { businessName: { contains: query.search } } },
              { servicePlan: { name: { contains: query.search } } },
              { servicePlan: { code: { contains: query.search } } },
            ],
          }
        : {}),
    };

    const [items, total, active, suspended, cancelled, terminated] =
      await Promise.all([
        this.prisma.subscription.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: {
              select: {
                id: true,
                accountNumber: true,
                firstName: true,
                lastName: true,
                businessName: true,
                status: true,
              },
            },
            servicePlan: {
              select: { id: true, code: true, name: true, monthlyPrice: true },
            },
            pppoeAccount: { select: { id: true, username: true, status: true } },
          },
        }),
        this.prisma.subscription.count({ where }),
        this.prisma.subscription.count({ where: { status: 'active' } }),
        this.prisma.subscription.count({ where: { status: 'suspended' } }),
        this.prisma.subscription.count({ where: { status: 'cancelled' } }),
        this.prisma.subscription.count({ where: { status: 'terminated' } }),
      ]);

    return {
      summary: [
        { label: 'Active Subscribers', value: active },
        { label: 'Suspended Subscribers', value: suspended },
        { label: 'Cancelled Subscribers', value: cancelled },
        { label: 'Terminated Subscribers', value: terminated },
      ],
      items: items.map((item) => ({
        ...item,
        servicePlan: {
          ...item.servicePlan,
          monthlyPrice: money(item.servicePlan.monthlyPrice),
        },
      })),
      meta: reportMeta(total, page, limit),
    };
  }

  async billing(query: ReportQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const { start, end, year, month } = monthRange(query.month, query.year);
    const status = query.filter as
      | 'draft'
      | 'issued'
      | 'partially_paid'
      | 'paid'
      | 'overdue'
      | 'cancelled'
      | undefined;

    const where = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(query.search
        ? {
            OR: [
              { invoiceNumber: { contains: query.search } },
              { customer: { accountNumber: { contains: query.search } } },
              { customer: { firstName: { contains: query.search } } },
              { customer: { lastName: { contains: query.search } } },
              { customer: { businessName: { contains: query.search } } },
            ],
          }
        : {}),
    };

    const monthlyWhere = {
      ...where,
      issueDate: { gte: start, lte: end },
    };

    const [
      items,
      total,
      issuedCount,
      paidCount,
      overdueCount,
      outstandingAgg,
      monthlyAgg,
    ] = await Promise.all([
      this.prisma.invoice.findMany({
        where: monthlyWhere,
        skip,
        take: limit,
        orderBy: { issueDate: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              accountNumber: true,
              firstName: true,
              lastName: true,
              businessName: true,
            },
          },
          billingCycle: { select: { id: true, name: true } },
        },
      }),
      this.prisma.invoice.count({ where: monthlyWhere }),
      this.prisma.invoice.count({
        where: { deletedAt: null, status: { in: ['issued', 'partially_paid'] } },
      }),
      this.prisma.invoice.count({ where: { deletedAt: null, status: 'paid' } }),
      this.prisma.invoice.count({ where: { deletedAt: null, status: 'overdue' } }),
      this.prisma.invoice.aggregate({
        where: {
          deletedAt: null,
          balance: { gt: 0 },
          status: { in: ['issued', 'partially_paid', 'overdue'] },
        },
        _sum: { balance: true },
      }),
      this.prisma.invoice.aggregate({
        where: monthlyWhere,
        _sum: { total: true, amountPaid: true },
        _count: true,
      }),
    ]);

    return {
      summary: [
        { label: 'Report Month', value: `${year}-${String(month).padStart(2, '0')}` },
        { label: 'Invoices This Month', value: monthlyAgg._count },
        {
          label: 'Monthly Billed',
          value: money(monthlyAgg._sum.total),
          format: 'money',
        },
        {
          label: 'Monthly Collected',
          value: money(monthlyAgg._sum.amountPaid),
          format: 'money',
        },
        { label: 'Open Invoices', value: issuedCount },
        { label: 'Paid Invoices', value: paidCount },
        { label: 'Overdue Invoices', value: overdueCount },
        {
          label: 'Outstanding Balance',
          value: money(outstandingAgg._sum.balance),
          format: 'money',
        },
      ],
      items: items.map((item) => ({
        id: item.id,
        invoiceNumber: item.invoiceNumber,
        issueDate: item.issueDate,
        dueDate: item.dueDate,
        status: item.status,
        subtotal: money(item.subtotal),
        total: money(item.total),
        amountPaid: money(item.amountPaid),
        balance: money(item.balance),
        customer: item.customer,
        billingCycle: item.billingCycle,
      })),
      meta: reportMeta(total, page, limit),
    };
  }

  async collections(query: ReportQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const status = query.filter as
      | 'pending'
      | 'contacted'
      | 'promised_to_pay'
      | 'escalated'
      | 'resolved'
      | 'cancelled'
      | undefined;

    const where = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(query.search
        ? {
            OR: [
              { assignedCollector: { contains: query.search } },
              { assignedCollectorUser: { name: { contains: query.search } } },
              { assignedCollectorUser: { email: { contains: query.search } } },
              { customer: { accountNumber: { contains: query.search } } },
              { customer: { firstName: { contains: query.search } } },
              { customer: { lastName: { contains: query.search } } },
              { invoice: { invoiceNumber: { contains: query.search } } },
            ],
          }
        : {}),
    };

    const [items, total, pending, escalated, resolved, balanceAgg] =
      await Promise.all([
        this.prisma.collectionCase.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: {
              select: {
                id: true,
                accountNumber: true,
                firstName: true,
                lastName: true,
                businessName: true,
              },
            },
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
                dueDate: true,
                balance: true,
                status: true,
              },
            },
            assignedCollectorUser: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
        this.prisma.collectionCase.count({ where }),
        this.prisma.collectionCase.count({
          where: { deletedAt: null, status: 'pending' },
        }),
        this.prisma.collectionCase.count({
          where: { deletedAt: null, status: 'escalated' },
        }),
        this.prisma.collectionCase.count({
          where: { deletedAt: null, status: 'resolved' },
        }),
        this.prisma.invoice.aggregate({
          where: { deletedAt: null, status: 'overdue' },
          _sum: { balance: true },
        }),
      ]);

    return {
      summary: [
        { label: 'Open Collection Cases', value: pending + escalated },
        { label: 'Pending Cases', value: pending },
        { label: 'Escalated Cases', value: escalated },
        { label: 'Resolved Cases', value: resolved },
        {
          label: 'Overdue Invoice Balance',
          value: money(balanceAgg._sum.balance),
          format: 'money',
        },
      ],
      items: items.map((item) => ({
        ...item,
        invoice: {
          ...item.invoice,
          balance: money(item.invoice.balance),
        },
      })),
      meta: reportMeta(total, page, limit),
    };
  }

  async referrals(query: ReportQueryDto) {
    const { page, limit, skip } = getPagination(query);

    const where = {
      referredCustomers: { some: {} },
      ...(query.search
        ? {
            OR: [
              { accountNumber: { contains: query.search } },
              { firstName: { contains: query.search } },
              { lastName: { contains: query.search } },
              { businessName: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [referrers, total, referredCustomers] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          accountNumber: true,
          firstName: true,
          lastName: true,
          businessName: true,
          status: true,
          _count: { select: { referredCustomers: true } },
          referredCustomers: {
            select: {
              id: true,
              accountNumber: true,
              firstName: true,
              lastName: true,
              businessName: true,
              status: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      }),
      this.prisma.customer.count({ where }),
      this.prisma.customer.count({
        where: { referredByCustomerId: { not: null } },
      }),
    ]);

    const activeReferrers = await this.prisma.customer.count({
      where: {
        referredCustomers: { some: { status: 'active' } },
      },
    });

    return {
      summary: [
        { label: 'Referred Customers', value: referredCustomers },
        { label: 'Active Referrers', value: activeReferrers },
        { label: 'Referrers Listed', value: total },
      ],
      items: referrers.map((referrer) => ({
        id: referrer.id,
        accountNumber: referrer.accountNumber,
        firstName: referrer.firstName,
        lastName: referrer.lastName,
        businessName: referrer.businessName,
        status: referrer.status,
        referralCount: referrer._count.referredCustomers,
        recentReferrals: referrer.referredCustomers,
      })),
      meta: reportMeta(total, page, limit),
    };
  }

  async network(query: ReportQueryDto) {
    const { page, limit, skip } = getPagination(query);

    const [
      routers,
      routerTotal,
      activeRouters,
      oltDevices,
      activeOlts,
      onuDevices,
      onlineOnus,
      offlineOnus,
      onlineSessions,
      openAlerts,
      monitoringTargets,
      degradedTargets,
    ] = await Promise.all([
      this.prisma.mikrotikRouter.findMany({
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          host: true,
          status: true,
          lastConnectionCheckAt: true,
          _count: { select: { pppoeAccounts: true, pppoeSessions: true } },
        },
      }),
      this.prisma.mikrotikRouter.count(),
      this.prisma.mikrotikRouter.count({ where: { status: 'active' } }),
      this.prisma.oltDevice.count({ where: { deletedAt: null } }),
      this.prisma.oltDevice.count({
        where: { deletedAt: null, status: 'active' },
      }),
      this.prisma.onuDevice.count({ where: { deletedAt: null } }),
      this.prisma.onuDevice.count({
        where: { deletedAt: null, status: 'online' },
      }),
      this.prisma.onuDevice.count({
        where: { deletedAt: null, status: { in: ['offline', 'los'] } },
      }),
      this.prisma.pppoeSession.count({ where: { status: 'online' } }),
      this.prisma.networkAlert.count({
        where: { deletedAt: null, status: { in: ['open', 'acknowledged'] } },
      }),
      this.prisma.networkMonitoringTarget.count({ where: { deletedAt: null } }),
      this.prisma.networkMonitoringTarget.count({
        where: { deletedAt: null, status: 'degraded' },
      }),
    ]);

    const offlineTargets = await this.prisma.networkMonitoringTarget.count({
      where: { deletedAt: null, status: 'offline' },
    });

    return {
      summary: [
        { label: 'Active Routers', value: activeRouters },
        { label: 'Online PPPoE Sessions', value: onlineSessions },
        { label: 'Active OLT Devices', value: activeOlts },
        { label: 'Online ONUs', value: onlineOnus },
        { label: 'Offline ONUs', value: offlineOnus },
        { label: 'Open Network Alerts', value: openAlerts },
        { label: 'Offline Monitor Targets', value: offlineTargets },
        { label: 'Degraded Monitor Targets', value: degradedTargets },
      ],
      items: routers.map((router) => ({
        deviceType: 'mikrotik_router',
        id: router.id,
        name: router.name,
        host: router.host,
        status: router.status,
        lastCheckedAt: router.lastConnectionCheckAt,
        pppoeAccounts: router._count.pppoeAccounts,
        activeSessions: router._count.pppoeSessions,
      })),
      meta: {
        ...reportMeta(routerTotal, page, limit),
        totals: {
          routers: routerTotal,
          oltDevices,
          onuDevices,
          monitoringTargets,
        },
      },
    };
  }

  async inventory(query: ReportQueryDto) {
    const { page, limit, skip } = getPagination(query);

    const stocks = await this.prisma.inventoryStock.findMany({
      include: {
        item: {
          select: {
            id: true,
            code: true,
            name: true,
            unit: true,
            reorderLevel: true,
            unitCost: true,
            isActive: true,
            category: { select: { id: true, code: true, name: true } },
          },
        },
        warehouse: { select: { id: true, code: true, name: true } },
      },
      orderBy: { quantity: 'asc' },
    });

    const rows = stocks
      .map((stock) => ({
        itemId: stock.item.id,
        code: stock.item.code,
        name: stock.item.name,
        unit: stock.item.unit,
        category: stock.item.category.name,
        warehouse: stock.warehouse.name,
        quantity: money(stock.quantity),
        reorderLevel: money(stock.item.reorderLevel),
        unitCost: money(stock.item.unitCost),
        stockValue: money(
          new Prisma.Decimal(stock.quantity).mul(stock.item.unitCost),
        ),
        isLowStock: new Prisma.Decimal(stock.quantity).lte(stock.item.reorderLevel),
        isActive: stock.item.isActive,
      }))
      .filter((row) =>
        query.search
          ? [row.code, row.name, row.category, row.warehouse].some((value) =>
              value.toLowerCase().includes(query.search!.toLowerCase()),
            )
          : true,
      )
      .filter((row) =>
        query.filter === 'low_stock' ? row.isLowStock : true,
      );

    const total = rows.length;
    const items = rows.slice(skip, skip + limit);

    const [movementCount, stockInAgg, stockOutAgg, lowStockCount, itemCount] =
      await Promise.all([
        this.prisma.inventoryMovement.count(),
        this.prisma.inventoryMovement.aggregate({
          where: { movementType: 'stock_in' },
          _sum: { quantity: true },
        }),
        this.prisma.inventoryMovement.aggregate({
          where: { movementType: 'stock_out' },
          _sum: { quantity: true },
        }),
        Promise.resolve(
          stocks.filter((stock) =>
            new Prisma.Decimal(stock.quantity).lte(stock.item.reorderLevel),
          ).length,
        ),
        this.prisma.inventoryItem.count({ where: { deletedAt: null } }),
      ]);

    const totalStockValue = stocks.reduce(
      (sum, stock) =>
        sum.add(new Prisma.Decimal(stock.quantity).mul(stock.item.unitCost)),
      new Prisma.Decimal(0),
    );

    return {
      summary: [
        { label: 'Inventory Items', value: itemCount },
        { label: 'Stock Rows', value: stocks.length },
        { label: 'Low Stock Rows', value: lowStockCount },
        { label: 'Stock Movements', value: movementCount },
        {
          label: 'Total Stock Value',
          value: money(totalStockValue),
          format: 'money',
        },
        { label: 'Total Stock In Qty', value: money(stockInAgg._sum.quantity) },
        { label: 'Total Stock Out Qty', value: money(stockOutAgg._sum.quantity) },
      ],
      items,
      meta: reportMeta(total, page, limit),
    };
  }

  async projects(query: ReportQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const status = query.filter as
      | 'planning'
      | 'active'
      | 'on_hold'
      | 'completed'
      | 'cancelled'
      | undefined;

    const where = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search } },
              { name: { contains: query.search } },
              { managerName: { contains: query.search } },
              { customer: { accountNumber: { contains: query.search } } },
            ],
          }
        : {}),
    };

    const [items, total, active, completed, onHold, budgetAgg, materialUsages] =
      await Promise.all([
        this.prisma.project.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: {
              select: {
                id: true,
                accountNumber: true,
                firstName: true,
                lastName: true,
                businessName: true,
              },
            },
            costing: true,
            _count: {
              select: {
                estimates: true,
                boms: true,
                materialUsages: true,
              },
            },
          },
        }),
        this.prisma.project.count({ where }),
        this.prisma.project.count({
          where: { deletedAt: null, status: 'active' },
        }),
        this.prisma.project.count({
          where: { deletedAt: null, status: 'completed' },
        }),
        this.prisma.project.count({
          where: { deletedAt: null, status: 'on_hold' },
        }),
        this.prisma.project.aggregate({
          where: { deletedAt: null },
          _sum: { budget: true },
        }),
        this.prisma.projectMaterialUsage.count({ where: { deletedAt: null } }),
      ]);

    const materialCostAgg = await this.prisma.projectMaterialUsageItem.aggregate({
      _sum: {
        quantity: true,
      },
    });

    return {
      summary: [
        { label: 'Active Projects', value: active },
        { label: 'Completed Projects', value: completed },
        { label: 'On Hold Projects', value: onHold },
        {
          label: 'Total Budget',
          value: money(budgetAgg._sum.budget),
          format: 'money',
        },
        { label: 'Material Usage Records', value: materialUsages },
        {
          label: 'Material Quantity Used',
          value: money(materialCostAgg._sum.quantity),
        },
      ],
      items: items.map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        status: item.status,
        projectType: item.projectType,
        budget: money(item.budget),
        managerName: item.managerName,
        startDate: item.startDate,
        targetDate: item.targetDate,
        completedAt: item.completedAt,
        customer: item.customer,
        estimateCount: item._count.estimates,
        bomCount: item._count.boms,
        materialUsageCount: item._count.materialUsages,
        costing: item.costing
          ? {
              status: item.costing.status,
              laborCost: money(item.costing.laborCost),
              overheadCost: money(item.costing.overheadCost),
              otherCost: money(item.costing.otherCost),
              totalCost: money(
                item.costing.laborCost
                  .add(item.costing.overheadCost)
                  .add(item.costing.otherCost),
              ),
            }
          : null,
      })),
      meta: reportMeta(total, page, limit),
    };
  }
}
