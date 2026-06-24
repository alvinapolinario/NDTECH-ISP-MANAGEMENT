import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  CollectionCaseStatus,
  CollectorMobileEventStatus,
  CollectorMobileEventType,
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import {
  ADMIN_PORTAL_ROLES,
  assertActiveStaffRole,
  STAFF_ROLES,
} from '../common/staff-role';
import { PppoeAccountsService } from '../mikrotik/pppoe-accounts.service';
import { getPagination } from '../common/pagination';
import { markOverdueInvoices } from '../invoices/invoice-overdue';
import { PrismaService } from '../prisma/prisma.service';
import {
  COLLECTOR_SYNC_PACKAGE_VERSION,
  CollectorSyncEventType,
  CollectorVisitOutcome,
} from './collector-sync.constants';
import {
  CollectorSyncScope,
  CollectorSyncDownloadQueryDto,
} from './dto/collector-sync-download-query.dto';
import {
  CollectorSyncDaySummaryQueryDto,
  ListCollectorSyncEventsQueryDto,
} from './dto/collector-sync-query.dto';
import { ListCollectorPaymentUploadsQueryDto } from './dto/collector-payment-uploads-query.dto';
import { CollectorSyncUploadDto } from './dto/collector-sync-upload-batch.dto';
import {
  CollectorSyncCollectionUpdatePayloadDto,
  CollectorSyncPaymentPayloadDto,
  CollectorSyncVisitNotePayloadDto,
} from './dto/collector-sync-event-payloads.dto';

type SyncEventResult = {
  localId: string;
  status: CollectorMobileEventStatus;
  message: string;
  paymentId?: number;
  paymentNumber?: string;
  collectionCaseId?: number;
  adjustedAmount?: number;
};

type DownloadInvoice = Prisma.InvoiceGetPayload<{
  include: {
    billingCycle: { select: { id: true; name: true } };
    subscription: {
      select: {
        id: true;
        status: true;
        billingDay: true;
        servicePlan: { select: { name: true } };
      };
    };
    collectionCase: true;
    customer: {
      select: {
        id: true;
        accountNumber: true;
        customerType: true;
        firstName: true;
        lastName: true;
        businessName: true;
        mobileNumber: true;
        email: true;
        status: true;
        addresses: true;
      };
    };
    items: {
      select: {
        id: true;
        itemType: true;
        description: true;
        quantity: true;
        unitPrice: true;
        amount: true;
      };
    };
  };
}>;

@Injectable()
export class CollectorSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pppoeAccountsService: PppoeAccountsService,
  ) {}

  async download(user: AuthenticatedUser, query: CollectorSyncDownloadQueryDto) {
    const collector = await this.resolveCollector(user);
    await markOverdueInvoices(this.prisma);
    const scope = query.scope ?? CollectorSyncScope.all_collectible;
    const page = query.page;
    const limit = query.limit;
    const paginated = page !== undefined || limit !== undefined;
    const { items: invoices, total } = await this.findDownloadInvoices(
      collector.id,
      scope,
      query,
    );

    const workItems = await Promise.all(
      invoices.map(async (invoice) => {
        const customerAddresses = invoice.customer.addresses ?? [];
        const installationAddress =
          customerAddresses.find(
            (address) => address.addressType === 'installation',
          ) ??
          customerAddresses[0] ??
          null;

        const recentPayments = await this.prisma.payment.findMany({
          where: {
            invoiceId: invoice.id,
            deletedAt: null,
            status: PaymentStatus.posted,
          },
          orderBy: { paymentDate: 'desc' },
          take: 3,
          select: {
            id: true,
            paymentNumber: true,
            amount: true,
            paymentDate: true,
            paymentMethod: true,
            receivedBy: true,
          },
        });

        return {
          invoice: {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            billingCycleId: invoice.billingCycleId,
            billingCycleName: invoice.billingCycle.name,
            customerId: invoice.customerId,
            subscriptionId: invoice.subscriptionId,
            issueDate: invoice.issueDate.toISOString().slice(0, 10),
            dueDate: invoice.dueDate.toISOString().slice(0, 10),
            subtotal: Number(invoice.subtotal),
            total: Number(invoice.total),
            amountPaid: Number(invoice.amountPaid),
            balance: Number(invoice.balance),
            status: invoice.status,
            updatedAt: invoice.updatedAt.toISOString(),
          },
          invoiceItems: (invoice.items ?? []).map((item) => ({
            id: item.id,
            itemType: item.itemType,
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            amount: Number(item.amount),
          })),
          customer: {
            id: invoice.customer.id,
            accountNumber: invoice.customer.accountNumber,
            displayName: this.customerDisplayName(invoice.customer),
            customerType: invoice.customer.customerType,
            mobileNumber: invoice.customer.mobileNumber,
            email: invoice.customer.email,
            status: invoice.customer.status,
          },
          installationAddress: installationAddress
            ? {
                id: installationAddress.id,
                street: installationAddress.street,
                barangay: installationAddress.barangay,
                municipality: installationAddress.municipality,
                province: installationAddress.province,
                barangayId: installationAddress.barangayId,
                latitude: installationAddress.latitude
                  ? Number(installationAddress.latitude)
                  : null,
                longitude: installationAddress.longitude
                  ? Number(installationAddress.longitude)
                  : null,
              }
            : null,
          subscription: invoice.subscription
            ? {
                id: invoice.subscription.id,
                status: invoice.subscription.status,
                servicePlanName: invoice.subscription.servicePlan?.name ?? null,
                billingDay: invoice.subscription.billingDay,
              }
            : null,
          collectionCase: invoice.collectionCase
            ? {
                id: invoice.collectionCase.id,
                status: invoice.collectionCase.status,
                priority: invoice.collectionCase.priority,
                assignedCollectorUserId:
                  invoice.collectionCase.assignedCollectorUserId,
                lastContactedAt: invoice.collectionCase.lastContactedAt
                  ? invoice.collectionCase.lastContactedAt.toISOString()
                  : null,
                nextFollowUpDate: invoice.collectionCase.nextFollowUpDate
                  ? invoice.collectionCase.nextFollowUpDate
                      .toISOString()
                      .slice(0, 10)
                  : null,
                promiseToPayDate: invoice.collectionCase.promiseToPayDate
                  ? invoice.collectionCase.promiseToPayDate
                      .toISOString()
                      .slice(0, 10)
                  : null,
                notes: invoice.collectionCase.notes,
                updatedAt: invoice.collectionCase.updatedAt.toISOString(),
              }
            : null,
          recentPayments: recentPayments.map((payment) => ({
            id: payment.id,
            paymentNumber: payment.paymentNumber,
            amount: Number(payment.amount),
            paymentDate: payment.paymentDate.toISOString().slice(0, 10),
            paymentMethod: payment.paymentMethod,
            receivedBy: payment.receivedBy,
          })),
        };
      }),
    );

    const checksum = this.buildChecksum(workItems);
    const totalCollectibleBalance = workItems.reduce(
      (sum, item) => sum + item.invoice.balance,
      0,
    );

    return {
      packageVersion: COLLECTOR_SYNC_PACKAGE_VERSION,
      generatedAt: new Date().toISOString(),
      checksum,
      collector: {
        id: collector.id,
        name: collector.name,
        email: collector.email,
        mobileNumber: collector.mobileNumber,
      },
      scope,
      summary: {
        workItemCount: total,
        pageWorkItemCount: workItems.length,
        customerCount: new Set(workItems.map((item) => item.customer.id)).size,
        totalCollectibleBalance,
        assignedCaseCount: workItems.filter((item) => item.collectionCase).length,
      },
      meta: paginated
        ? {
            total,
            page: page ?? 1,
            limit: limit ?? workItems.length,
            hasMore: (page ?? 1) * (limit ?? workItems.length) < total,
          }
        : undefined,
      workItems,
    };
  }

  async listEvents(
    user: AuthenticatedUser,
    query: ListCollectorSyncEventsQueryDto,
  ) {
    await this.resolveCollector(user);
    const { page, limit, skip } = getPagination(query);
    const where = this.buildCollectorEventsWhere(user, query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.collectorMobileEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { processedAt: 'desc' },
        include: this.collectorMobileEventInclude(),
      }),
      this.prisma.collectorMobileEvent.count({ where }),
    ]);

    return {
      items: items.map((event) => this.mapCollectorMobileEvent(event)),
      meta: { total, page, limit },
    };
  }

  async listPaymentUploads(
    user: AuthenticatedUser,
    query: ListCollectorPaymentUploadsQueryDto,
  ) {
    await this.resolveCollector(user);
    const { page, limit, skip } = getPagination(query);
    const where = {
      ...this.buildCollectorEventsWhere(user, query),
      eventType: CollectorMobileEventType.payment,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.collectorMobileEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { processedAt: 'desc' },
        include: this.collectorMobileEventInclude(),
      }),
      this.prisma.collectorMobileEvent.count({ where }),
    ]);

    return {
      items: items.map((event) => this.mapPaymentUploadEvent(event)),
      meta: { total, page, limit },
    };
  }

  async paymentUploadsSummary(
    user: AuthenticatedUser,
    query: ListCollectorPaymentUploadsQueryDto,
  ) {
    await this.resolveCollector(user);
    const where = {
      ...this.buildCollectorEventsWhere(user, query),
      eventType: CollectorMobileEventType.payment,
    };

    const events = await this.prisma.collectorMobileEvent.findMany({
      where,
      select: {
        resultStatus: true,
        eventPayload: true,
        payment: {
          select: {
            amount: true,
          },
        },
      },
    });

    const byStatus = events.reduce<Record<string, number>>((acc, event) => {
      acc[event.resultStatus] = (acc[event.resultStatus] ?? 0) + 1;
      return acc;
    }, {});

    const totalUploaded = events.reduce((sum, event) => {
      const payload = event.eventPayload as Record<string, unknown>;
      const amount = Number(payload.amount ?? 0);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);

    const totalPosted = events.reduce((sum, event) => {
      if (!event.payment) return sum;
      return sum + Number(event.payment.amount);
    }, 0);

    return {
      totalUploads: events.length,
      totalUploaded,
      totalPosted,
      byStatus,
    };
  }

  private buildCollectorEventsWhere(
    user: AuthenticatedUser,
    query: {
      collectorUserId?: number;
      eventType?: CollectorMobileEventType;
      resultStatus?: CollectorMobileEventStatus;
      from?: string;
      to?: string;
    },
  ) {
    const isAdmin = user.roles.some((role) => ADMIN_PORTAL_ROLES.has(role.name));

    if (query.collectorUserId && !isAdmin) {
      throw new ForbiddenException('Only admins can filter by collector');
    }

    return {
      ...(isAdmin
        ? query.collectorUserId
          ? { collectorUserId: query.collectorUserId }
          : {}
        : { collectorUserId: user.id }),
      ...(query.eventType ? { eventType: query.eventType } : {}),
      ...(query.resultStatus ? { resultStatus: query.resultStatus } : {}),
      ...(query.from || query.to
        ? {
            processedAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
  }

  private collectorMobileEventInclude() {
    return {
      collector: {
        select: { id: true, name: true, email: true },
      },
      payment: {
        select: {
          id: true,
          paymentNumber: true,
          amount: true,
          paymentDate: true,
          paymentMethod: true,
          invoiceId: true,
          invoice: {
            select: {
              invoiceNumber: true,
              customer: {
                select: {
                  id: true,
                  accountNumber: true,
                  firstName: true,
                  lastName: true,
                  businessName: true,
                },
              },
            },
          },
        },
      },
      collectionCase: {
        select: {
          id: true,
          invoiceId: true,
          customerId: true,
          status: true,
        },
      },
    };
  }

  private mapCollectorMobileEvent(
    event: Prisma.CollectorMobileEventGetPayload<{
      include: ReturnType<CollectorSyncService['collectorMobileEventInclude']>;
    }>,
  ) {
    return {
      id: event.id,
      localId: event.localId,
      deviceId: event.deviceId,
      eventType: event.eventType,
      eventPayload: event.eventPayload,
      resultStatus: event.resultStatus,
      resultMessage: event.resultMessage,
      paymentId: event.paymentId,
      collectionCaseId: event.collectionCaseId,
      processedAt: event.processedAt.toISOString(),
      collector: event.collector,
      payment: event.payment
        ? {
            ...event.payment,
            amount: Number(event.payment.amount),
          }
        : null,
      collectionCase: event.collectionCase,
    };
  }

  private mapPaymentUploadEvent(
    event: Prisma.CollectorMobileEventGetPayload<{
      include: ReturnType<CollectorSyncService['collectorMobileEventInclude']>;
    }>,
  ) {
    const payload = (event.eventPayload ?? {}) as Record<string, unknown>;
    const uploadedAmount = Number(payload.amount ?? 0);
    const customer = event.payment?.invoice?.customer;

    return {
      id: event.id,
      localId: event.localId,
      deviceId: event.deviceId,
      processedAt: event.processedAt.toISOString(),
      resultStatus: event.resultStatus,
      resultMessage: event.resultMessage,
      collector: event.collector,
      uploadedAmount: Number.isFinite(uploadedAmount) ? uploadedAmount : 0,
      paymentMethod: payload.paymentMethod ? String(payload.paymentMethod) : '',
      paymentDate: payload.paymentDate ? String(payload.paymentDate) : '',
      localReceiptNumber: payload.localReceiptNumber
        ? String(payload.localReceiptNumber)
        : null,
      invoiceId: Number(payload.invoiceId ?? event.payment?.invoiceId ?? 0),
      invoiceNumber: event.payment?.invoice?.invoiceNumber ?? null,
      customerName: customer ? this.customerDisplayName(customer) : null,
      customerAccountNumber: customer?.accountNumber ?? null,
      payment: event.payment
        ? {
            id: event.payment.id,
            paymentNumber: event.payment.paymentNumber,
            amount: Number(event.payment.amount),
            paymentDate: event.payment.paymentDate,
            paymentMethod: event.payment.paymentMethod,
          }
        : null,
    };
  }

  async daySummary(
    user: AuthenticatedUser,
    query: CollectorSyncDaySummaryQueryDto,
  ) {
    const collector = await this.resolveSummaryCollector(user, query.collectorUserId);
    const date = query.date ?? new Date().toISOString().slice(0, 10);
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    const [syncEvents, payments] = await this.prisma.$transaction([
      this.prisma.collectorMobileEvent.findMany({
        where: {
          collectorUserId: collector.id,
          processedAt: { gte: dayStart, lte: dayEnd },
        },
        select: {
          eventType: true,
          resultStatus: true,
          paymentId: true,
        },
      }),
      this.prisma.payment.findMany({
        where: {
          collectorUserId: collector.id,
          deletedAt: null,
          status: PaymentStatus.posted,
          paymentDate: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
        select: {
          id: true,
          paymentNumber: true,
          amount: true,
          paymentMethod: true,
          invoiceId: true,
        },
      }),
    ]);

    const syncSummary = syncEvents.reduce(
      (acc, event) => {
        acc.total += 1;
        acc.byType[event.eventType] = (acc.byType[event.eventType] ?? 0) + 1;
        acc.byStatus[event.resultStatus] =
          (acc.byStatus[event.resultStatus] ?? 0) + 1;
        return acc;
      },
      {
        total: 0,
        byType: {} as Record<string, number>,
        byStatus: {} as Record<string, number>,
      },
    );

    const totalCollected = payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0,
    );

    return {
      date,
      collector: {
        id: collector.id,
        name: collector.name,
      },
      collections: {
        paymentCount: payments.length,
        totalCollected,
        payments: payments.map((payment) => ({
          id: payment.id,
          paymentNumber: payment.paymentNumber,
          invoiceId: payment.invoiceId,
          amount: Number(payment.amount),
          paymentMethod: payment.paymentMethod,
        })),
      },
      sync: syncSummary,
    };
  }

  async upload(user: AuthenticatedUser, dto: CollectorSyncUploadDto) {
    if (dto.packageVersion !== COLLECTOR_SYNC_PACKAGE_VERSION) {
      throw new BadRequestException(
        `Unsupported package version ${dto.packageVersion}`,
      );
    }

    const collector = await this.resolveCollector(user);
    const results: SyncEventResult[] = [];

    for (const event of dto.events) {
      const existing = await this.prisma.collectorMobileEvent.findUnique({
        where: { localId: event.localId },
        include: {
          payment: { select: { id: true, paymentNumber: true } },
        },
      });

      if (existing) {
        results.push({
          localId: event.localId,
          status: CollectorMobileEventStatus.duplicate,
          message: 'Event already processed',
          paymentId: existing.paymentId ?? undefined,
          paymentNumber: existing.payment?.paymentNumber,
          collectionCaseId: existing.collectionCaseId ?? undefined,
        });
        continue;
      }

      try {
        const result = await this.processEvent(
          collector.id,
          dto.deviceId,
          event.type,
          event.localId,
          event.payload,
        );
        results.push(result);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to process event';

        await this.prisma.collectorMobileEvent.create({
          data: {
            localId: event.localId,
            collectorUserId: collector.id,
            deviceId: dto.deviceId,
            eventType: this.mapEventType(event.type),
            eventPayload: event.payload as Prisma.InputJsonValue,
            resultStatus: CollectorMobileEventStatus.rejected,
            resultMessage: message,
          },
        });

        results.push({
          localId: event.localId,
          status: CollectorMobileEventStatus.rejected,
          message,
        });
      }
    }

    const summary = results.reduce(
      (acc, result) => {
        acc[result.status] += 1;
        return acc;
      },
      {
        accepted: 0,
        adjusted: 0,
        rejected: 0,
        duplicate: 0,
      },
    );

    return {
      packageVersion: COLLECTOR_SYNC_PACKAGE_VERSION,
      processedAt: new Date().toISOString(),
      collector: {
        id: collector.id,
        name: collector.name,
      },
      downloadChecksum: dto.downloadChecksum ?? null,
      summary,
      results,
    };
  }

  private async processEvent(
    collectorUserId: number,
    deviceId: string,
    type: CollectorSyncEventType,
    localId: string,
    payload: Record<string, unknown>,
  ): Promise<SyncEventResult> {
    if (type === CollectorSyncEventType.payment) {
      return this.processPaymentEvent(
        collectorUserId,
        deviceId,
        localId,
        payload,
      );
    }

    if (type === CollectorSyncEventType.collection_update) {
      return this.processCollectionUpdateEvent(
        collectorUserId,
        deviceId,
        localId,
        payload,
      );
    }

    if (type === CollectorSyncEventType.visit_note) {
      return this.processVisitNoteEvent(
        collectorUserId,
        deviceId,
        localId,
        payload,
      );
    }

    throw new BadRequestException(`Unsupported event type: ${type}`);
  }

  private async processPaymentEvent(
    collectorUserId: number,
    deviceId: string,
    localId: string,
    rawPayload: Record<string, unknown>,
  ): Promise<SyncEventResult> {
    const payload = await this.validatePayload(
      CollectorSyncPaymentPayloadDto,
      rawPayload,
    );

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: payload.invoiceId, deletedAt: null },
      include: { collectionCase: true },
    });

    if (!invoice) {
      throw new BadRequestException('Invoice not found');
    }

    if (invoice.status === InvoiceStatus.cancelled) {
      throw new BadRequestException('Invoice is cancelled');
    }

    if (invoice.status === InvoiceStatus.paid || Number(invoice.balance) <= 0) {
      throw new BadRequestException('Invoice is already fully paid');
    }

    const currentBalance = Number(invoice.balance);
    let amount = payload.amount;
    let resultStatus: CollectorMobileEventStatus =
      CollectorMobileEventStatus.accepted;
    let message = 'Payment posted';

    if (amount > currentBalance) {
      amount = currentBalance;
      resultStatus = CollectorMobileEventStatus.adjusted;
      message = `Payment adjusted to remaining balance (${amount})`;
    }

    const collector = await this.prisma.user.findUnique({
      where: { id: collectorUserId },
      select: { id: true, name: true },
    });

    if (!collector) {
      throw new BadRequestException('Collector not found');
    }

    const noteParts = [
      payload.notes?.trim(),
      payload.localReceiptNumber
        ? `Mobile receipt: ${payload.localReceiptNumber}`
        : null,
      `Device: ${deviceId}`,
    ].filter(Boolean);

    const payment = await this.prisma.payment.create({
      data: {
        paymentNumber: await this.nextPaymentNumber(),
        invoiceId: invoice.id,
        customerId: invoice.customerId,
        amount,
        paymentDate: new Date(payload.paymentDate),
        paymentMethod: payload.paymentMethod,
        referenceNumber: payload.referenceNumber,
        receivedBy: collector.name,
        collectorUserId: collector.id,
        notes: noteParts.length ? noteParts.join('\n') : null,
      },
    });

    await this.recalculateInvoice(invoice.id, payment.id);

    let collectionCaseId = invoice.collectionCase?.id ?? null;
    if (collectionCaseId) {
      const refreshedInvoice = await this.prisma.invoice.findUnique({
        where: { id: invoice.id },
      });

      const nextStatus =
        refreshedInvoice?.status === InvoiceStatus.paid
          ? CollectionCaseStatus.resolved
          : CollectionCaseStatus.contacted;

      await this.prisma.collectionCase.update({
        where: { id: collectionCaseId },
        data: {
          status: nextStatus,
          lastContactedAt: new Date(payload.paymentDate),
        },
      });
    }

    await this.prisma.collectorMobileEvent.create({
      data: {
        localId,
        collectorUserId,
        deviceId,
        eventType: CollectorMobileEventType.payment,
        eventPayload: rawPayload as Prisma.InputJsonValue,
        resultStatus,
        resultMessage: message,
        paymentId: payment.id,
        collectionCaseId,
      },
    });

    return {
      localId,
      status: resultStatus,
      message,
      paymentId: payment.id,
      paymentNumber: payment.paymentNumber,
      collectionCaseId: collectionCaseId ?? undefined,
      adjustedAmount: resultStatus === CollectorMobileEventStatus.adjusted ? amount : undefined,
    };
  }

  private async processCollectionUpdateEvent(
    collectorUserId: number,
    deviceId: string,
    localId: string,
    rawPayload: Record<string, unknown>,
  ): Promise<SyncEventResult> {
    const payload = await this.validatePayload(
      CollectorSyncCollectionUpdatePayloadDto,
      rawPayload,
    );

    const collectionCase = await this.resolveCollectionCase(
      payload.invoiceId,
      payload.collectionCaseId,
      collectorUserId,
    );

    const updated = await this.prisma.collectionCase.update({
      where: { id: collectionCase.id },
      data: {
        status: payload.status,
        lastContactedAt:
          payload.lastContactedAt === null
            ? null
            : payload.lastContactedAt
              ? new Date(payload.lastContactedAt)
              : undefined,
        nextFollowUpDate:
          payload.nextFollowUpDate === null
            ? null
            : payload.nextFollowUpDate
              ? new Date(payload.nextFollowUpDate)
              : undefined,
        promiseToPayDate:
          payload.promiseToPayDate === null
            ? null
            : payload.promiseToPayDate
              ? new Date(payload.promiseToPayDate)
              : undefined,
        notes: payload.notes === null ? null : payload.notes,
      },
    });

    await this.prisma.collectorMobileEvent.create({
      data: {
        localId,
        collectorUserId,
        deviceId,
        eventType: CollectorMobileEventType.collection_update,
        eventPayload: rawPayload as Prisma.InputJsonValue,
        resultStatus: CollectorMobileEventStatus.accepted,
        resultMessage: 'Collection case updated',
        collectionCaseId: updated.id,
      },
    });

    return {
      localId,
      status: CollectorMobileEventStatus.accepted,
      message: 'Collection case updated',
      collectionCaseId: updated.id,
    };
  }

  private async processVisitNoteEvent(
    collectorUserId: number,
    deviceId: string,
    localId: string,
    rawPayload: Record<string, unknown>,
  ): Promise<SyncEventResult> {
    const payload = await this.validatePayload(
      CollectorSyncVisitNotePayloadDto,
      rawPayload,
    );

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: payload.invoiceId, deletedAt: null },
      include: { collectionCase: true },
    });

    if (!invoice) {
      throw new BadRequestException('Invoice not found');
    }

    const status = this.visitOutcomeToStatus(payload.visitOutcome);
    const noteLine = this.formatVisitNote(payload);
    const collectionCase = await this.ensureCollectionCase(
      invoice.id,
      invoice.customerId,
      collectorUserId,
      invoice.collectionCase,
    );

    const mergedNotes = [collectionCase.notes?.trim(), noteLine]
      .filter(Boolean)
      .join('\n');

    const updated = await this.prisma.collectionCase.update({
      where: { id: collectionCase.id },
      data: {
        status,
        lastContactedAt: new Date(payload.visitedAt),
        nextFollowUpDate:
          payload.visitOutcome === CollectorVisitOutcome.not_home
            ? this.nextFollowUpDate(payload.visitedAt)
            : undefined,
        promiseToPayDate:
          payload.visitOutcome === CollectorVisitOutcome.promised
            ? this.nextFollowUpDate(payload.visitedAt)
            : undefined,
        notes: mergedNotes,
      },
    });

    await this.prisma.collectorMobileEvent.create({
      data: {
        localId,
        collectorUserId,
        deviceId,
        eventType: CollectorMobileEventType.visit_note,
        eventPayload: rawPayload as Prisma.InputJsonValue,
        resultStatus: CollectorMobileEventStatus.accepted,
        resultMessage: 'Visit note recorded',
        collectionCaseId: updated.id,
      },
    });

    return {
      localId,
      status: CollectorMobileEventStatus.accepted,
      message: 'Visit note recorded',
      collectionCaseId: updated.id,
    };
  }

  private async resolveCollector(user: AuthenticatedUser) {
    const isAdmin = user.roles.some((role) => ADMIN_PORTAL_ROLES.has(role.name));

    if (!isAdmin) {
      await assertActiveStaffRole(
        this.prisma,
        user.id,
        STAFF_ROLES.COLLECTOR,
      );
    }

    const dbUser = await this.prisma.user.findFirst({
      where: { id: user.id, deletedAt: null, status: 'active' },
      select: {
        id: true,
        name: true,
        email: true,
        mobileNumber: true,
      },
    });

    if (!dbUser) {
      throw new ForbiddenException('Active user required');
    }

    return dbUser;
  }

  private async resolveSummaryCollector(
    user: AuthenticatedUser,
    collectorUserId?: number,
  ) {
    const isAdmin = user.roles.some((role) => ADMIN_PORTAL_ROLES.has(role.name));

    if (collectorUserId && !isAdmin) {
      throw new ForbiddenException('Only admins can filter by collector');
    }

    if (collectorUserId) {
      await assertActiveStaffRole(
        this.prisma,
        collectorUserId,
        STAFF_ROLES.COLLECTOR,
      );

      const collector = await this.prisma.user.findFirst({
        where: {
          id: collectorUserId,
          deletedAt: null,
          status: 'active',
        },
        select: {
          id: true,
          name: true,
          email: true,
          mobileNumber: true,
        },
      });

      if (!collector) {
        throw new ForbiddenException('Collector not found');
      }

      return collector;
    }

    return this.resolveCollector(user);
  }

  private async findDownloadInvoices(
    collectorUserId: number,
    scope: CollectorSyncScope,
    query: CollectorSyncDownloadQueryDto,
  ): Promise<{ items: DownloadInvoice[]; total: number }> {
    const include = this.downloadInclude();
    const where = this.buildDownloadWhere(collectorUserId, scope, query);
    const page = Math.max(query.page ?? 1, 1);
    const limit = query.limit;
    const paginated = limit !== undefined;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        orderBy: [{ dueDate: 'asc' }, { invoiceNumber: 'asc' }],
        include,
        ...(paginated
          ? {
              skip: (page - 1) * limit,
              take: limit,
            }
          : {}),
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { items, total };
  }

  private buildDownloadWhere(
    collectorUserId: number,
    scope: CollectorSyncScope,
    query: CollectorSyncDownloadQueryDto,
  ): Prisma.InvoiceWhereInput {
    const collectibleStatuses: InvoiceStatus[] = [
      InvoiceStatus.issued,
      InvoiceStatus.partially_paid,
      InvoiceStatus.overdue,
    ];

    const sinceFilter = query.since
      ? {
          OR: [
            { updatedAt: { gte: new Date(query.since) } },
            { collectionCase: { updatedAt: { gte: new Date(query.since) } } },
          ],
        }
      : {};

    const baseWhere: Prisma.InvoiceWhereInput = {
      deletedAt: null,
      balance: { gt: 0 },
      status: { in: collectibleStatuses },
      ...(query.billingCycleId ? { billingCycleId: query.billingCycleId } : {}),
      ...(query.barangayId
        ? {
            customer: {
              addresses: {
                some: { barangayId: query.barangayId },
              },
            },
          }
        : {}),
      ...sinceFilter,
    };

    if (scope === CollectorSyncScope.assigned) {
      return {
        ...baseWhere,
        collectionCase: {
          deletedAt: null,
          assignedCollectorUserId: collectorUserId,
        },
      };
    }

    return baseWhere;
  }

  private downloadInclude() {
    return {
      billingCycle: { select: { id: true, name: true } },
      subscription: {
        select: {
          id: true,
          status: true,
          billingDay: true,
          servicePlan: { select: { name: true } },
        },
      },
      collectionCase: {
        where: { deletedAt: null },
      },
      customer: {
        select: {
          id: true,
          accountNumber: true,
          customerType: true,
          firstName: true,
          lastName: true,
          businessName: true,
          mobileNumber: true,
          email: true,
          status: true,
          addresses: {
            orderBy: { id: 'asc' as const },
          },
        },
      },
      items: {
        orderBy: { id: 'asc' as const },
        select: {
          id: true,
          itemType: true,
          description: true,
          quantity: true,
          unitPrice: true,
          amount: true,
        },
      },
    } satisfies Prisma.InvoiceInclude;
  }

  private async resolveCollectionCase(
    invoiceId: number,
    collectionCaseId: number | undefined,
    collectorUserId: number,
  ) {
    if (collectionCaseId) {
      const collectionCase = await this.prisma.collectionCase.findFirst({
        where: {
          id: collectionCaseId,
          invoiceId,
          deletedAt: null,
        },
      });

      if (!collectionCase) {
        throw new BadRequestException('Collection case not found for invoice');
      }

      return collectionCase;
    }

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, deletedAt: null },
      include: { collectionCase: true },
    });

    if (!invoice) {
      throw new BadRequestException('Invoice not found');
    }

    return this.ensureCollectionCase(
      invoice.id,
      invoice.customerId,
      collectorUserId,
      invoice.collectionCase,
    );
  }

  private async ensureCollectionCase(
    invoiceId: number,
    customerId: number,
    collectorUserId: number,
    existing: { id: number; notes: string | null } | null,
  ) {
    if (existing) {
      return existing;
    }

    const collector = await this.prisma.user.findUnique({
      where: { id: collectorUserId },
      select: { id: true, name: true },
    });

    return this.prisma.collectionCase.create({
      data: {
        invoiceId,
        customerId,
        assignedCollectorUserId: collector?.id,
        assignedCollector: collector?.name,
        status: CollectionCaseStatus.pending,
      },
    });
  }

  private visitOutcomeToStatus(outcome: CollectorVisitOutcome) {
    switch (outcome) {
      case CollectorVisitOutcome.promised:
        return CollectionCaseStatus.promised_to_pay;
      case CollectorVisitOutcome.escalated:
        return CollectionCaseStatus.escalated;
      case CollectorVisitOutcome.paid:
        return CollectionCaseStatus.resolved;
      case CollectorVisitOutcome.not_home:
      case CollectorVisitOutcome.contacted:
      default:
        return CollectionCaseStatus.contacted;
    }
  }

  private formatVisitNote(payload: CollectorSyncVisitNotePayloadDto) {
    const coords =
      payload.latitude !== undefined && payload.longitude !== undefined
        ? ` @ ${payload.latitude},${payload.longitude}`
        : '';
    const note = payload.note?.trim() ? ` - ${payload.note.trim()}` : '';
    return `[${payload.visitedAt}] ${payload.visitOutcome}${note}${coords}`;
  }

  private nextFollowUpDate(visitedAt: string) {
    const date = new Date(visitedAt);
    date.setDate(date.getDate() + 1);
    return date;
  }

  private async validatePayload<T extends object>(
    cls: new () => T,
    payload: Record<string, unknown>,
  ) {
    const instance = plainToInstance(cls, payload);
    const errors = await validate(instance);

    if (errors.length) {
      throw new BadRequestException('Invalid event payload');
    }

    return instance;
  }

  private mapEventType(type: CollectorSyncEventType): CollectorMobileEventType {
    switch (type) {
      case CollectorSyncEventType.payment:
        return CollectorMobileEventType.payment;
      case CollectorSyncEventType.collection_update:
        return CollectorMobileEventType.collection_update;
      case CollectorSyncEventType.visit_note:
        return CollectorMobileEventType.visit_note;
      default:
        throw new BadRequestException(`Unsupported event type: ${type}`);
    }
  }

  private customerDisplayName(customer: {
    businessName: string | null;
    firstName: string | null;
    lastName: string | null;
  }) {
    if (customer.businessName?.trim()) {
      return customer.businessName.trim();
    }

    return [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim();
  }

  private buildChecksum(workItems: Array<{ invoice: { id: number; updatedAt: string } }>) {
    const digest = workItems
      .map((item) => `${item.invoice.id}:${item.invoice.updatedAt}`)
      .sort()
      .join('|');

    return createHash('sha256').update(digest).digest('hex');
  }

  private async postedTotalForInvoice(invoiceId: number) {
    const aggregate = await this.prisma.payment.aggregate({
      where: {
        invoiceId,
        status: PaymentStatus.posted,
        deletedAt: null,
      },
      _sum: { amount: true },
    });

    return aggregate._sum.amount ?? new Prisma.Decimal(0);
  }

  private async recalculateInvoice(invoiceId: number, paymentId?: number) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) return;

    const previousStatus = invoice.status;
    const amountPaid = await this.postedTotalForInvoice(invoiceId);
    const balance = Prisma.Decimal.max(
      new Prisma.Decimal(0),
      invoice.total.minus(amountPaid),
    );
    const status =
      balance.equals(0) && amountPaid.greaterThan(0)
        ? InvoiceStatus.paid
        : amountPaid.greaterThan(0)
          ? InvoiceStatus.partially_paid
          : invoice.status === InvoiceStatus.draft
            ? InvoiceStatus.draft
            : InvoiceStatus.issued;

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        amountPaid,
        balance,
        status,
      },
    });

    if (
      status === InvoiceStatus.paid &&
      previousStatus !== InvoiceStatus.paid
    ) {
      await this.pppoeAccountsService.restoreAfterPayment(invoiceId, paymentId);
    }
  }

  private async nextPaymentNumber() {
    const now = new Date();
    const prefix = `PAY-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count = await this.prisma.payment.count({
      where: { paymentNumber: { startsWith: prefix } },
    });

    return `${prefix}-${String(count + 1).padStart(4, '0')}`;
  }
}
