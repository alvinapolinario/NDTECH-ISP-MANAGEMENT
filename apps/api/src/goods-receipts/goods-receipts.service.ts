import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GoodsReceiptStatus, Prisma } from '@prisma/client';
import { getPagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGoodsReceiptDto } from './dto/create-goods-receipt.dto';
import { ListGoodsReceiptsQueryDto } from './dto/list-goods-receipts-query.dto';

@Injectable()
export class GoodsReceiptsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateGoodsReceiptDto) {
    if (!dto.items?.length) throw new BadRequestException('At least one received item is required');

    return this.prisma.$transaction(async (tx) => {
      const [order, warehouse] = await Promise.all([
        tx.purchaseOrder.findFirst({
          where: { id: dto.purchaseOrderId, deletedAt: null },
          include: { items: true },
        }),
        tx.warehouse.findFirst({ where: { id: dto.warehouseId, deletedAt: null } }),
      ]);
      if (!order) throw new NotFoundException('Purchase order not found');
      if (!warehouse) throw new NotFoundException('Warehouse not found');
      if (order.status === 'cancelled') throw new BadRequestException('Cancelled purchase orders cannot be received');

      const orderItems = new Map(order.items.map((item) => [item.id, item]));
      const receiptItems = dto.items.map((item) => {
        const orderItem = orderItems.get(item.purchaseOrderItemId);
        if (!orderItem) throw new BadRequestException('Received item does not belong to the selected purchase order');
        const received = Number(orderItem.receivedQuantity);
        const ordered = Number(orderItem.quantity);
        const nextReceived = received + item.quantityReceived;
        if (nextReceived > ordered) {
          throw new BadRequestException(`Received quantity exceeds ordered quantity for item ${orderItem.itemId}`);
        }
        return {
          purchaseOrderItemId: item.purchaseOrderItemId,
          itemId: orderItem.itemId,
          quantityReceived: item.quantityReceived,
          unitCost: item.unitCost ?? Number(orderItem.unitCost),
          notes: item.notes,
        };
      });

      const receiptNumber = dto.receiptNumber || `GR-${Date.now().toString().slice(-8)}`;
      const receipt = await tx.goodsReceipt.create({
        data: {
          receiptNumber,
          purchaseOrderId: dto.purchaseOrderId,
          supplierId: order.supplierId,
          warehouseId: dto.warehouseId,
          receivedDate: this.toRequiredDateOrUndefined(dto.receivedDate),
          receivedBy: dto.receivedBy,
          deliveryReceiptNo: dto.deliveryReceiptNo,
          notes: dto.notes,
          items: { create: receiptItems },
        },
        include: this.includeRelations(),
      });

      for (const item of receiptItems) {
        await tx.purchaseOrderItem.update({
          where: { id: item.purchaseOrderItemId },
          data: { receivedQuantity: { increment: item.quantityReceived } },
        });
        await this.adjustStock(tx, item.itemId, dto.warehouseId, item.quantityReceived);
        await tx.inventoryMovement.create({
          data: {
            itemId: item.itemId,
            warehouseId: dto.warehouseId,
            movementType: 'stock_in',
            quantity: item.quantityReceived,
            unitCost: item.unitCost,
            referenceType: 'goods_receipt',
            referenceNo: receiptNumber,
            notes: dto.deliveryReceiptNo ? `DR: ${dto.deliveryReceiptNo}` : dto.notes,
          },
        });
      }

      await this.refreshPurchaseOrderStatus(tx, dto.purchaseOrderId);
      return receipt;
    });
  }

  async findAll(query: ListGoodsReceiptsQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const status = query.status ?? (query.filter as GoodsReceiptStatus | undefined);
    const search = query.search?.trim();
    const where: Prisma.GoodsReceiptWhereInput = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { receiptNumber: { contains: search } },
              { deliveryReceiptNo: { contains: search } },
              { receivedBy: { contains: search } },
              { notes: { contains: search } },
              { purchaseOrder: { poNumber: { contains: search } } },
              { supplier: { name: { contains: search } } },
              { warehouse: { name: { contains: search } } },
              { items: { some: { item: { name: { contains: search } } } } },
              { items: { some: { item: { code: { contains: search } } } } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.goodsReceipt.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.includeRelations(),
      }),
      this.prisma.goodsReceipt.count({ where }),
    ]);
    return { items, meta: { total, page, limit } };
  }

  async findOne(id: number) {
    const receipt = await this.prisma.goodsReceipt.findFirst({
      where: { id, deletedAt: null },
      include: this.includeRelations(),
    });
    if (!receipt) throw new NotFoundException('Goods receipt not found');
    return receipt;
  }

  private async adjustStock(tx: Prisma.TransactionClient, itemId: number, warehouseId: number, delta: number) {
    const stock = await tx.inventoryStock.upsert({
      where: { itemId_warehouseId: { itemId, warehouseId } },
      update: {},
      create: { itemId, warehouseId, quantity: 0 },
    });
    return tx.inventoryStock.update({
      where: { id: stock.id },
      data: { quantity: Number(stock.quantity) + delta },
    });
  }

  private async refreshPurchaseOrderStatus(tx: Prisma.TransactionClient, purchaseOrderId: number) {
    const items = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId } });
    const anyReceived = items.some((item) => Number(item.receivedQuantity) > 0);
    const allReceived = items.every((item) => Number(item.receivedQuantity) >= Number(item.quantity));
    if (!anyReceived) return;
    await tx.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: { status: allReceived ? 'received' : 'partially_received' },
    });
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
      purchaseOrder: { select: { id: true, poNumber: true, status: true } },
      supplier: { select: { id: true, code: true, name: true } },
      warehouse: { select: { id: true, code: true, name: true } },
      items: {
        include: {
          item: { select: { id: true, code: true, name: true, unit: true } },
          purchaseOrderItem: { select: { id: true, quantity: true, receivedQuantity: true, unitCost: true } },
        },
      },
    };
  }
}
