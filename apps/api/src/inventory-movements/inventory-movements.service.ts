import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryMovementType, Prisma } from '@prisma/client';
import { getPagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInventoryMovementDto } from './dto/create-inventory-movement.dto';
import { ListInventoryMovementsQueryDto } from './dto/list-inventory-movements-query.dto';

@Injectable()
export class InventoryMovementsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateInventoryMovementDto) {
    return this.prisma.$transaction(async (tx) => {
      await this.ensureItemAndWarehouse(tx, dto.itemId, dto.warehouseId);

      if (dto.movementType === 'transfer') {
        if (!dto.toWarehouseId) {
          throw new BadRequestException('Destination warehouse is required for transfers');
        }
        if (dto.toWarehouseId === dto.warehouseId) {
          throw new BadRequestException('Destination warehouse must be different');
        }
        await this.ensureWarehouse(tx, dto.toWarehouseId);
        await this.adjustStock(tx, dto.itemId, dto.warehouseId, -dto.quantity);
        await this.adjustStock(tx, dto.itemId, dto.toWarehouseId, dto.quantity);
      } else if (dto.movementType === 'stock_out') {
        await this.adjustStock(tx, dto.itemId, dto.warehouseId, -dto.quantity);
      } else {
        await this.adjustStock(tx, dto.itemId, dto.warehouseId, dto.quantity);
      }

      return tx.inventoryMovement.create({
        data: dto,
        include: this.includeRelations(),
      });
    });
  }

  async findAll(query: ListInventoryMovementsQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const search = query.search?.trim();
    const where: Prisma.InventoryMovementWhereInput = {
      ...(query.movementType ? { movementType: query.movementType as InventoryMovementType } : {}),
      ...(query.itemId ? { itemId: query.itemId } : {}),
      ...(query.warehouseId
        ? { OR: [{ warehouseId: query.warehouseId }, { toWarehouseId: query.warehouseId }] }
        : {}),
      ...(search
        ? {
            OR: [
              { referenceType: { contains: search } },
              { referenceNo: { contains: search } },
              { notes: { contains: search } },
              { item: { code: { contains: search } } },
              { item: { name: { contains: search } } },
              { warehouse: { name: { contains: search } } },
              { toWarehouse: { name: { contains: search } } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.inventoryMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.includeRelations(),
      }),
      this.prisma.inventoryMovement.count({ where }),
    ]);

    return { items, meta: { total, page, limit } };
  }

  async findOne(id: number) {
    const movement = await this.prisma.inventoryMovement.findUnique({
      where: { id },
      include: this.includeRelations(),
    });
    if (!movement) throw new NotFoundException('Inventory movement not found');
    return movement;
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

  private async ensureWarehouse(tx: Prisma.TransactionClient, warehouseId: number) {
    const warehouse = await tx.warehouse.findFirst({
      where: { id: warehouseId, deletedAt: null },
    });
    if (!warehouse) throw new NotFoundException('Destination warehouse not found');
  }

  private async adjustStock(
    tx: Prisma.TransactionClient,
    itemId: number,
    warehouseId: number,
    delta: number,
  ) {
    const stock = await tx.inventoryStock.upsert({
      where: { itemId_warehouseId: { itemId, warehouseId } },
      update: {},
      create: { itemId, warehouseId, quantity: 0 },
    });
    const nextQuantity = Number(stock.quantity) + delta;
    if (nextQuantity < 0) {
      throw new BadRequestException('Insufficient stock for this movement');
    }
    return tx.inventoryStock.update({
      where: { id: stock.id },
      data: { quantity: nextQuantity },
    });
  }

  private includeRelations() {
    return {
      item: { select: { id: true, code: true, name: true, unit: true } },
      warehouse: { select: { id: true, code: true, name: true } },
      toWarehouse: { select: { id: true, code: true, name: true } },
    };
  }
}
