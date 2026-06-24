import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryItemType, Prisma } from '@prisma/client';
import { getPagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { ListInventoryItemsQueryDto } from './dto/list-inventory-items-query.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';

@Injectable()
export class InventoryItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateInventoryItemDto) {
    try {
      return await this.prisma.inventoryItem.create({
        data: dto,
        include: this.includeRelations(),
      });
    } catch (error) {
      this.rethrowUniqueCodeConflict(error);
    }
  }

  async findAll(query: ListInventoryItemsQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const search = query.search?.trim();
    const where: Prisma.InventoryItemWhereInput = {
      deletedAt: null,
      ...(query.filter === 'active' || query.filter === 'inactive'
        ? { isActive: query.filter === 'active' }
        : {}),
      ...(query.itemType ? { itemType: query.itemType as InventoryItemType } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search } },
              { name: { contains: search } },
              { description: { contains: search } },
              { category: { name: { contains: search } } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.inventoryItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.includeRelations(),
      }),
      this.prisma.inventoryItem.count({ where }),
    ]);

    return { items, meta: { total, page, limit } };
  }

  async findOne(id: number) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id, deletedAt: null },
      include: this.includeRelations(),
    });
    if (!item) throw new NotFoundException('Inventory item not found');
    return item;
  }

  async update(id: number, dto: UpdateInventoryItemDto) {
    await this.findOne(id);
    try {
      return await this.prisma.inventoryItem.update({
        where: { id },
        data: dto,
        include: this.includeRelations(),
      });
    } catch (error) {
      this.rethrowUniqueCodeConflict(error);
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.inventoryItem.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: this.includeRelations(),
    });
  }

  private includeRelations() {
    return {
      category: { select: { id: true, code: true, name: true } },
      stocks: {
        include: { warehouse: { select: { id: true, code: true, name: true } } },
      },
    };
  }

  private rethrowUniqueCodeConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Inventory item code already exists');
    }
    throw error;
  }
}
