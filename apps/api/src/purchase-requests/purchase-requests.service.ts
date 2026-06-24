import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PurchaseRequestPriority, PurchaseRequestStatus } from '@prisma/client';
import { getPagination } from '../common/pagination';
import { resolveStaffAssignment, STAFF_ROLES } from '../common/staff-role';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseRequestDto } from './dto/create-purchase-request.dto';
import { ListPurchaseRequestsQueryDto } from './dto/list-purchase-requests-query.dto';
import { PurchaseRequestItemDto } from './dto/purchase-request-item.dto';
import { UpdatePurchaseRequestDto } from './dto/update-purchase-request.dto';

@Injectable()
export class PurchaseRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePurchaseRequestDto) {
    if (!dto.items?.length) throw new BadRequestException('At least one item is required');
    const requestNumber = dto.requestNumber || `PR-${Date.now().toString().slice(-8)}`;
    await this.ensureItemsExist(dto.items);
    const financeAssignment = await resolveStaffAssignment(
      this.prisma,
      dto.financeReviewerUserId,
      STAFF_ROLES.FINANCE,
    );

    return this.prisma.purchaseRequest.create({
      data: {
        requestNumber,
        supplierId: dto.supplierId,
        status: dto.status,
        priority: dto.priority,
        requestedBy: dto.requestedBy,
        neededDate: this.toDateOrNull(dto.neededDate),
        purpose: dto.purpose,
        notes: dto.notes,
        financeReviewerUserId:
          financeAssignment === undefined ? undefined : financeAssignment.userId,
        items: { create: dto.items.map((item) => this.toItemCreate(item)) },
      },
      include: this.includeRelations(),
    });
  }

  async findAll(query: ListPurchaseRequestsQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const status = query.status ?? (query.filter as PurchaseRequestStatus | undefined);
    const search = query.search?.trim();
    const where: Prisma.PurchaseRequestWhereInput = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(query.priority ? { priority: query.priority as PurchaseRequestPriority } : {}),
      ...(search
        ? {
            OR: [
              { requestNumber: { contains: search } },
              { requestedBy: { contains: search } },
              { purpose: { contains: search } },
              { notes: { contains: search } },
              { supplier: { name: { contains: search } } },
              { items: { some: { item: { name: { contains: search } } } } },
              { items: { some: { item: { code: { contains: search } } } } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.purchaseRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.includeRelations(),
      }),
      this.prisma.purchaseRequest.count({ where }),
    ]);
    return { items, meta: { total, page, limit } };
  }

  async findOne(id: number) {
    const request = await this.prisma.purchaseRequest.findFirst({
      where: { id, deletedAt: null },
      include: this.includeRelations(),
    });
    if (!request) throw new NotFoundException('Purchase request not found');
    return request;
  }

  async update(id: number, dto: UpdatePurchaseRequestDto) {
    await this.findOne(id);
    if (dto.items) {
      if (!dto.items.length) throw new BadRequestException('At least one item is required');
      await this.ensureItemsExist(dto.items);
    }

    const financeAssignment = await resolveStaffAssignment(
      this.prisma,
      dto.financeReviewerUserId,
      STAFF_ROLES.FINANCE,
    );

    return this.prisma.$transaction(async (tx) => {
      if (dto.items) {
        await tx.purchaseRequestItem.deleteMany({ where: { purchaseRequestId: id } });
      }

      return tx.purchaseRequest.update({
        where: { id },
        data: {
          requestNumber: dto.requestNumber,
          supplierId: dto.supplierId,
          status: dto.status,
          priority: dto.priority,
          requestedBy: dto.requestedBy,
          neededDate: this.toDateOrNull(dto.neededDate),
          purpose: dto.purpose,
          notes: dto.notes,
          approvedBy: dto.approvedBy,
          approvedAt: dto.status === 'approved' ? new Date() : undefined,
          rejectedReason: dto.rejectedReason,
          ...(financeAssignment !== undefined
            ? { financeReviewerUserId: financeAssignment.userId }
            : {}),
          items: dto.items
            ? { create: dto.items.map((item) => this.toItemCreate(item)) }
            : undefined,
        },
        include: this.includeRelations(),
      });
    });
  }

  async approve(id: number) {
    const request = await this.findOne(id);
    return this.prisma.purchaseRequest.update({
      where: { id },
      data: {
        status: 'approved',
        approvedBy: request.financeReviewer?.name ?? 'Operations',
        approvedAt: new Date(),
      },
      include: this.includeRelations(),
    });
  }

  async reject(id: number, reason?: string) {
    await this.findOne(id);
    return this.prisma.purchaseRequest.update({
      where: { id },
      data: { status: 'rejected', rejectedReason: reason || null },
      include: this.includeRelations(),
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.purchaseRequest.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: this.includeRelations(),
    });
  }

  private async ensureItemsExist(items: PurchaseRequestItemDto[]) {
    const ids = [...new Set(items.map((item) => item.itemId))];
    const count = await this.prisma.inventoryItem.count({
      where: { id: { in: ids }, deletedAt: null },
    });
    if (count !== ids.length) throw new NotFoundException('One or more inventory items were not found');
  }

  private toItemCreate(item: PurchaseRequestItemDto) {
    return {
      itemId: item.itemId,
      description: item.description,
      quantity: item.quantity,
      estimatedUnitCost: item.estimatedUnitCost,
      notes: item.notes,
    };
  }

  private toDateOrNull(value?: string | null) {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    return new Date(value);
  }

  private includeRelations() {
    return {
      supplier: { select: { id: true, code: true, name: true } },
      financeReviewer: {
        select: {
          id: true,
          name: true,
          email: true,
          mobileNumber: true,
        },
      },
      items: {
        include: {
          item: { select: { id: true, code: true, name: true, unit: true } },
        },
      },
    };
  }
}
