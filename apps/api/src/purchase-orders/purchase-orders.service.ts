import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PurchaseOrderStatus } from '@prisma/client';
import { getPagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { ListPurchaseOrdersQueryDto } from './dto/list-purchase-orders-query.dto';
import { PurchaseOrderItemDto } from './dto/purchase-order-item.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePurchaseOrderDto) {
    if (!dto.items?.length) throw new BadRequestException('At least one item is required');
    await this.ensureSupplier(dto.supplierId);
    if (dto.purchaseRequestId) await this.ensurePurchaseRequest(dto.purchaseRequestId);
    await this.ensureItemsExist(dto.items);

    return this.prisma.purchaseOrder.create({
      data: {
        poNumber: dto.poNumber || `PO-${Date.now().toString().slice(-8)}`,
        supplierId: dto.supplierId,
        purchaseRequestId: dto.purchaseRequestId,
        status: dto.status,
        orderDate: this.toRequiredDateOrUndefined(dto.orderDate),
        expectedDate: this.toDateOrNull(dto.expectedDate),
        paymentTerms: dto.paymentTerms,
        deliveryAddress: dto.deliveryAddress,
        notes: dto.notes,
        items: { create: dto.items.map((item) => this.toItemCreate(item)) },
      },
      include: this.includeRelations(),
    });
  }

  async findAll(query: ListPurchaseOrdersQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const status = query.status ?? (query.filter as PurchaseOrderStatus | undefined);
    const search = query.search?.trim();
    const where: Prisma.PurchaseOrderWhereInput = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { poNumber: { contains: search } },
              { paymentTerms: { contains: search } },
              { deliveryAddress: { contains: search } },
              { notes: { contains: search } },
              { supplier: { name: { contains: search } } },
              { purchaseRequest: { requestNumber: { contains: search } } },
              { items: { some: { item: { name: { contains: search } } } } },
              { items: { some: { item: { code: { contains: search } } } } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.includeRelations(),
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);
    return { items, meta: { total, page, limit } };
  }

  async findOne(id: number) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, deletedAt: null },
      include: this.includeRelations(),
    });
    if (!order) throw new NotFoundException('Purchase order not found');
    return order;
  }

  async update(id: number, dto: UpdatePurchaseOrderDto) {
    const order = await this.findOne(id);
    if (order.status === 'received') throw new BadRequestException('Received purchase orders cannot be edited');
    if (dto.supplierId) await this.ensureSupplier(dto.supplierId);
    if (dto.purchaseRequestId) await this.ensurePurchaseRequest(dto.purchaseRequestId);
    if (dto.items) {
      if (!dto.items.length) throw new BadRequestException('At least one item is required');
      const receivedLineCount = order.items.filter((item) => Number(item.receivedQuantity) > 0).length;
      if (receivedLineCount) throw new BadRequestException('Purchase orders with received items cannot replace lines');
      await this.ensureItemsExist(dto.items);
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.items) {
        await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
      }

      return tx.purchaseOrder.update({
        where: { id },
        data: {
          poNumber: dto.poNumber,
          supplierId: dto.supplierId,
          purchaseRequestId: dto.purchaseRequestId,
          status: dto.status,
          orderDate: this.toRequiredDateOrUndefined(dto.orderDate),
          expectedDate: this.toDateOrNull(dto.expectedDate),
          paymentTerms: dto.paymentTerms,
          deliveryAddress: dto.deliveryAddress,
          notes: dto.notes,
          items: dto.items ? { create: dto.items.map((item) => this.toItemCreate(item)) } : undefined,
        },
        include: this.includeRelations(),
      });
    });
  }

  async issue(id: number) {
    await this.findOne(id);
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'issued', issuedBy: 'Operations', issuedAt: new Date() },
      include: this.includeRelations(),
    });
  }

  async cancel(id: number, reason?: string) {
    const order = await this.findOne(id);
    if (order.items.some((item) => Number(item.receivedQuantity) > 0)) {
      throw new BadRequestException('Purchase orders with received items cannot be cancelled');
    }
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'cancelled', cancelledReason: reason || null },
      include: this.includeRelations(),
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: this.includeRelations(),
    });
  }

  private async ensureSupplier(supplierId: number) {
    const supplier = await this.prisma.supplier.findFirst({ where: { id: supplierId, deletedAt: null } });
    if (!supplier) throw new NotFoundException('Supplier not found');
  }

  private async ensurePurchaseRequest(purchaseRequestId: number) {
    const request = await this.prisma.purchaseRequest.findFirst({
      where: { id: purchaseRequestId, deletedAt: null },
    });
    if (!request) throw new NotFoundException('Purchase request not found');
  }

  private async ensureItemsExist(items: PurchaseOrderItemDto[]) {
    const ids = [...new Set(items.map((item) => item.itemId))];
    const count = await this.prisma.inventoryItem.count({ where: { id: { in: ids }, deletedAt: null } });
    if (count !== ids.length) throw new NotFoundException('One or more inventory items were not found');
  }

  private toItemCreate(item: PurchaseOrderItemDto) {
    return {
      itemId: item.itemId,
      description: item.description,
      quantity: item.quantity,
      unitCost: item.unitCost,
      notes: item.notes,
    };
  }

  private toDateOrNull(value?: string | null) {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    return new Date(value);
  }

  private toRequiredDateOrUndefined(value?: string | null) {
    if (value === undefined || value === null || value === '') return undefined;
    return new Date(value);
  }

  private includeRelations() {
    return {
      supplier: { select: { id: true, code: true, name: true } },
      purchaseRequest: { select: { id: true, requestNumber: true } },
      items: {
        include: { item: { select: { id: true, code: true, name: true, unit: true } } },
      },
    };
  }
}
