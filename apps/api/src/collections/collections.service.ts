import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CollectionCaseStatus, InvoiceStatus, Prisma } from '@prisma/client';
import { getPagination } from '../common/pagination';
import { resolveStaffAssignment, STAFF_ROLES } from '../common/staff-role';
import { markOverdueInvoices, startOfToday } from '../invoices/invoice-overdue';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCollectionCaseDto } from './dto/create-collection-case.dto';
import { ListCollectionCasesQueryDto } from './dto/list-collection-cases-query.dto';
import { UpdateCollectionCaseDto } from './dto/update-collection-case.dto';

@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCollectionCaseDto) {
    const invoice = await this.ensureCollectibleInvoice(dto.invoiceId);
    const existing = await this.prisma.collectionCase.findUnique({
      where: { invoiceId: invoice.id },
    });

    if (existing && !existing.deletedAt) {
      throw new BadRequestException('Collection case already exists for this invoice');
    }

    const collectorAssignment = await resolveStaffAssignment(
      this.prisma,
      dto.assignedCollectorUserId,
      STAFF_ROLES.COLLECTOR,
    );
    const financeAssignment = await resolveStaffAssignment(
      this.prisma,
      dto.assignedFinanceUserId,
      STAFF_ROLES.FINANCE,
    );

    const data = {
      customerId: invoice.customerId,
      status: dto.status,
      priority: dto.priority,
      assignedCollector:
        collectorAssignment === undefined
          ? dto.assignedCollector
          : collectorAssignment.name,
      assignedCollectorUserId:
        collectorAssignment === undefined
          ? dto.assignedCollectorUserId
          : collectorAssignment.userId,
      assignedFinanceUserId:
        financeAssignment === undefined ? undefined : financeAssignment.userId,
      lastContactedAt: dto.lastContactedAt ? new Date(dto.lastContactedAt) : null,
      nextFollowUpDate: dto.nextFollowUpDate ? new Date(dto.nextFollowUpDate) : null,
      promiseToPayDate: dto.promiseToPayDate ? new Date(dto.promiseToPayDate) : null,
      notes: dto.notes,
      deletedAt: null,
    };

    if (existing) {
      return this.prisma.collectionCase.update({
        where: { id: existing.id },
        data,
        include: this.includeRelations(),
      });
    }

    return this.prisma.collectionCase.create({
      data: {
        invoiceId: invoice.id,
        ...data,
      },
      include: this.includeRelations(),
    });
  }

  async importOverdue() {
    const markedOverdue = await markOverdueInvoices(this.prisma);
    const invoices = await this.prisma.invoice.findMany({
      where: {
        deletedAt: null,
        balance: { gt: new Prisma.Decimal(0) },
        dueDate: { lt: startOfToday() },
        status: { in: [InvoiceStatus.issued, InvoiceStatus.partially_paid, InvoiceStatus.overdue] },
      },
      select: {
        id: true,
        customerId: true,
      },
    });

    let created = 0;
    let restored = 0;
    let skipped = 0;

    for (const invoice of invoices) {
      const existing = await this.prisma.collectionCase.findUnique({
        where: { invoiceId: invoice.id },
      });

      if (existing && !existing.deletedAt) {
        skipped += 1;
        continue;
      }

      if (existing) {
        await this.prisma.collectionCase.update({
          where: { id: existing.id },
          data: {
            status: CollectionCaseStatus.pending,
            customerId: invoice.customerId,
            deletedAt: null,
          },
        });
        restored += 1;
        continue;
      }

      await this.prisma.collectionCase.create({
        data: {
          invoiceId: invoice.id,
          customerId: invoice.customerId,
          status: CollectionCaseStatus.pending,
        },
      });
      created += 1;
    }

    return {
      scanned: invoices.length,
      created,
      restored,
      skipped,
      markedOverdue,
      message: 'Collection import completed',
    };
  }

  async findAll(query: ListCollectionCasesQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const status = query.status ?? (query.filter as CollectionCaseStatus | undefined);
    const search = query.search?.trim();

    const where = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.invoiceId ? { invoiceId: query.invoiceId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(search
        ? {
            OR: [
              { assignedCollector: { contains: search } },
              { assignedCollectorUser: { name: { contains: search } } },
              { assignedCollectorUser: { email: { contains: search } } },
              { notes: { contains: search } },
              { invoice: { invoiceNumber: { contains: search } } },
              {
                customer: {
                  OR: [
                    { firstName: { contains: search } },
                    { lastName: { contains: search } },
                    { businessName: { contains: search } },
                    { accountNumber: { contains: search } },
                  ],
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.collectionCase.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        include: this.includeRelations(),
      }),
      this.prisma.collectionCase.count({ where }),
    ]);

    return { items, meta: { total, page, limit } };
  }

  async findOne(id: number) {
    const collectionCase = await this.prisma.collectionCase.findFirst({
      where: { id, deletedAt: null },
      include: this.includeRelations(),
    });
    if (!collectionCase) throw new NotFoundException('Collection case not found');
    return collectionCase;
  }

  async update(id: number, dto: UpdateCollectionCaseDto) {
    await this.findOne(id);
    const collectorAssignment = await resolveStaffAssignment(
      this.prisma,
      dto.assignedCollectorUserId,
      STAFF_ROLES.COLLECTOR,
    );
    const financeAssignment = await resolveStaffAssignment(
      this.prisma,
      dto.assignedFinanceUserId,
      STAFF_ROLES.FINANCE,
    );

    return this.prisma.collectionCase.update({
      where: { id },
      data: {
        status: dto.status,
        priority: dto.priority,
        ...(collectorAssignment !== undefined
          ? {
              assignedCollectorUserId: collectorAssignment.userId,
              assignedCollector: collectorAssignment.name,
            }
          : { assignedCollector: dto.assignedCollector }),
        ...(financeAssignment !== undefined
          ? { assignedFinanceUserId: financeAssignment.userId }
          : {}),
        lastContactedAt:
          dto.lastContactedAt === null
            ? null
            : dto.lastContactedAt
              ? new Date(dto.lastContactedAt)
              : undefined,
        nextFollowUpDate:
          dto.nextFollowUpDate === null
            ? null
            : dto.nextFollowUpDate
              ? new Date(dto.nextFollowUpDate)
              : undefined,
        promiseToPayDate:
          dto.promiseToPayDate === null
            ? null
            : dto.promiseToPayDate
              ? new Date(dto.promiseToPayDate)
              : undefined,
        notes: dto.notes,
      },
      include: this.includeRelations(),
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.collectionCase.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: this.includeRelations(),
    });
  }

  private async ensureCollectibleInvoice(invoiceId: number) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, deletedAt: null },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === InvoiceStatus.cancelled || invoice.status === InvoiceStatus.paid) {
      throw new BadRequestException('Invoice is not collectible');
    }
    if (invoice.balance.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Invoice has no collectible balance');
    }
    return invoice;
  }

  private includeRelations() {
    return {
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          dueDate: true,
          total: true,
          amountPaid: true,
          balance: true,
          status: true,
          billingCycle: { select: { id: true, name: true } },
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
      assignedCollectorUser: {
        select: {
          id: true,
          name: true,
          email: true,
          mobileNumber: true,
        },
      },
      assignedFinanceUser: {
        select: {
          id: true,
          name: true,
          email: true,
          mobileNumber: true,
        },
      },
    };
  }
}
