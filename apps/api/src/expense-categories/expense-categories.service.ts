import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { getPagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';

@Injectable()
export class ExpenseCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateExpenseCategoryDto) {
    try {
      return await this.prisma.expenseCategory.create({
        data: {
          name: dto.name,
          description: dto.description,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (error) {
      this.rethrowUniqueNameConflict(error);
    }
  }

  async findAll(query: ListQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const search = query.search?.trim();

    const where = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { description: { contains: search } },
            ],
          }
        : {}),
      ...(query.filter === 'active' || query.filter === 'inactive'
        ? { isActive: query.filter === 'active' }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.expenseCategory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.expenseCategory.count({ where }),
    ]);

    return { items, meta: { total, page, limit } };
  }

  async findOne(id: number) {
    const category = await this.prisma.expenseCategory.findFirst({
      where: { id, deletedAt: null },
    });

    if (!category) {
      throw new NotFoundException('Expense category not found');
    }

    return category;
  }

  async update(id: number, dto: UpdateExpenseCategoryDto) {
    await this.findOne(id);

    try {
      return await this.prisma.expenseCategory.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      this.rethrowUniqueNameConflict(error);
    }
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.expenseCategory.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private rethrowUniqueNameConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Expense category name already exists');
    }

    throw error;
  }
}
