import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { getPagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInventoryCategoryDto } from './dto/create-inventory-category.dto';
import { UpdateInventoryCategoryDto } from './dto/update-inventory-category.dto';

@Injectable()
export class InventoryCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateInventoryCategoryDto) {
    try {
      return await this.prisma.inventoryCategory.create({ data: dto });
    } catch (error) {
      this.rethrowUniqueCodeConflict(error);
    }
  }

  async findAll(query: ListQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const where = {
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search } },
              { name: { contains: query.search } },
              { description: { contains: query.search } },
            ],
          }
        : {}),
      ...(query.filter === 'active' || query.filter === 'inactive'
        ? { isActive: query.filter === 'active' }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.inventoryCategory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inventoryCategory.count({ where }),
    ]);

    return { items, meta: { total, page, limit } };
  }

  async findOne(id: number) {
    const category = await this.prisma.inventoryCategory.findFirst({
      where: { id, deletedAt: null },
    });

    if (!category) throw new NotFoundException('Inventory category not found');
    return category;
  }

  async update(id: number, dto: UpdateInventoryCategoryDto) {
    await this.findOne(id);
    try {
      return await this.prisma.inventoryCategory.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      this.rethrowUniqueCodeConflict(error);
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.inventoryCategory.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private rethrowUniqueCodeConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Inventory category code already exists');
    }
    throw error;
  }
}
