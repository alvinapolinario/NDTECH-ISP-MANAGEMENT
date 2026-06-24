import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { getPagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketCategoryDto } from './dto/create-ticket-category.dto';
import { UpdateTicketCategoryDto } from './dto/update-ticket-category.dto';

@Injectable()
export class TicketCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateTicketCategoryDto) {
    return this.prisma.ticketCategory.create({ data: dto });
  }

  async findAll(query: ListQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const where: Prisma.TicketCategoryWhereInput = {
      deletedAt: null,
      ...(query.filter === 'active' ? { isActive: true } : {}),
      ...(query.filter === 'inactive' ? { isActive: false } : {}),
      ...(query.search
        ? { OR: [{ code: { contains: query.search } }, { name: { contains: query.search } }] }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.ticketCategory.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
      this.prisma.ticketCategory.count({ where }),
    ]);
    return { items, meta: { total, page, limit } };
  }

  async findOne(id: number) {
    const category = await this.prisma.ticketCategory.findFirst({ where: { id, deletedAt: null } });
    if (!category) throw new NotFoundException('Ticket category not found');
    return category;
  }

  async update(id: number, dto: UpdateTicketCategoryDto) {
    await this.findOne(id);
    return this.prisma.ticketCategory.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.ticketCategory.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
