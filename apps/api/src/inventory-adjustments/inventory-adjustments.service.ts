import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryAdjustmentType, Prisma } from '@prisma/client';
import { getPagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInventoryAdjustmentDto } from './dto/create-inventory-adjustment.dto';
import { ListInventoryAdjustmentsQueryDto } from './dto/list-inventory-adjustments-query.dto';

@Injectable()
export class InventoryAdjustmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateInventoryAdjustmentDto) {
    return this.prisma.$transaction(async (tx) => {
      await this.ensureItemAndWarehouse(tx, dto.itemId, dto.warehouseId);
      const stock = await tx.inventoryStock.upsert({
        where: {
          itemId_warehouseId: {
            itemId: dto.itemId,
            warehouseId: dto.warehouseId,
          },
        },
        update: {},
        create: { itemId: dto.itemId, warehouseId: dto.warehouseId, quantity: 0 },
      });

      const previousQuantity = Number(stock.quantity);
      const newQuantity = this.calculateNewQuantity(
        previousQuantity,
        dto.quantity,
        dto.adjustmentType,
      );

      if (newQuantity < 0) {
        throw new BadRequestException('Adjustment cannot make stock negative');
      }

      await tx.inventoryStock.update({
        where: { id: stock.id },
        data: { quantity: newQuantity },
      });

      return tx.inventoryAdjustment.create({
        data: {
          ...dto,
          previousQuantity,
          newQuantity,
        },
        include: this.includeRelations(),
      });
    });
  }

  async findAll(query: ListInventoryAdjustmentsQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const search = query.search?.trim();
    const where: Prisma.InventoryAdjustmentWhereInput = {
      ...(query.adjustmentType
        ? { adjustmentType: query.adjustmentType as InventoryAdjustmentType }
        : {}),
      ...(query.itemId ? { itemId: query.itemId } : {}),
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(search
        ? {
            OR: [
              { reason: { contains: search } },
              { notes: { contains: search } },
              { item: { code: { contains: search } } },
              { item: { name: { contains: search } } },
              { warehouse: { name: { contains: search } } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.inventoryAdjustment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.includeRelations(),
      }),
      this.prisma.inventoryAdjustment.count({ where }),
    ]);

    return { items, meta: { total, page, limit } };
  }

  async findOne(id: number) {
    const adjustment = await this.prisma.inventoryAdjustment.findUnique({
      where: { id },
      include: this.includeRelations(),
    });
    if (!adjustment) throw new NotFoundException('Inventory adjustment not found');
    return adjustment;
  }

  private calculateNewQuantity(
    previousQuantity: number,
    quantity: number,
    adjustmentType: InventoryAdjustmentType,
  ) {
    if (adjustmentType === 'increase') return previousQuantity + quantity;
    if (adjustmentType === 'decrease') return previousQuantity - quantity;
    return quantity;
  }

  private async ensureItemAndWarehouse(
    tx: Prisma.TransactionClient,
    itemId: number,
    warehouseId: number,
  ) {
    const [item, warehouse] = await Promise.all([
      tx.inventoryItem.findFirst({ where: { id: itemId, deletedAt: null } }),
      tx.warehouse.findFirst({ where: { id: warehouseId, deletedAt: null } }),
    ]);
    if (!item) throw new NotFoundException('Inventory item not found');
    if (!warehouse) throw new NotFoundException('Warehouse not found');
  }

  private includeRelations() {
    return {
      item: { select: { id: true, code: true, name: true, unit: true } },
      warehouse: { select: { id: true, code: true, name: true } },
    };
  }
}
