import { Injectable } from '@nestjs/common';
import {
  PppoeAccountActionType,
  PppoeAccountStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PppoeAccountActionLoggerService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    pppoeAccountId: number;
    customerId?: number | null;
    routerId: number;
    action: PppoeAccountActionType;
    triggerSource?: string;
    previousStatus?: PppoeAccountStatus | null;
    newStatus?: PppoeAccountStatus | null;
    previousProfile?: string | null;
    newProfile?: string | null;
    performedByUserId?: number | null;
    invoiceId?: number | null;
    paymentId?: number | null;
    mikrotikMessage?: string | null;
    notes?: string | null;
  }) {
    return this.prisma.pppoeAccountActionLog.create({
      data: {
        pppoeAccountId: params.pppoeAccountId,
        customerId: params.customerId ?? null,
        routerId: params.routerId,
        action: params.action,
        triggerSource: params.triggerSource ?? 'manual',
        previousStatus: params.previousStatus ?? null,
        newStatus: params.newStatus ?? null,
        previousProfile: params.previousProfile ?? null,
        newProfile: params.newProfile ?? null,
        performedByUserId: params.performedByUserId ?? null,
        invoiceId: params.invoiceId ?? null,
        paymentId: params.paymentId ?? null,
        mikrotikMessage: params.mikrotikMessage ?? null,
        notes: params.notes ?? null,
      },
      include: this.includeRelations(),
    });
  }

  async findByAccount(pppoeAccountId: number, limit = 20) {
    return this.prisma.pppoeAccountActionLog.findMany({
      where: { pppoeAccountId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: this.includeRelations(),
    });
  }

  private includeRelations() {
    return {
      performedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
        },
      },
      payment: {
        select: {
          id: true,
          paymentNumber: true,
        },
      },
    } satisfies Prisma.PppoeAccountActionLogInclude;
  }
}
