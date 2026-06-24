import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TicketPriority, TicketStatus } from '@prisma/client';
import { getPagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ListTicketsQueryDto } from './dto/list-tickets-query.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTicketDto) {
    await this.ensureLookups(dto.categoryId, dto.customerId, dto.subscriptionId);
    return this.prisma.ticket.create({
      data: {
        ticketNumber: dto.ticketNumber || `TCK-${Date.now().toString().slice(-8)}`,
        customerId: dto.customerId,
        subscriptionId: dto.subscriptionId,
        categoryId: dto.categoryId,
        subject: dto.subject,
        description: dto.description,
        status: dto.status,
        priority: dto.priority,
        reportedBy: dto.reportedBy,
        contactNumber: dto.contactNumber,
        location: dto.location,
        dueAt: this.toDateOrNull(dto.dueAt),
        notes: dto.notes,
      },
      include: this.includeRelations(),
    });
  }

  async findAll(query: ListTicketsQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const status = query.status ?? (query.filter as TicketStatus | undefined);
    const search = query.search?.trim();
    const where: Prisma.TicketWhereInput = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(query.priority ? { priority: query.priority as TicketPriority } : {}),
      ...(search
        ? {
            OR: [
              { ticketNumber: { contains: search } },
              { subject: { contains: search } },
              { description: { contains: search } },
              { reportedBy: { contains: search } },
              { contactNumber: { contains: search } },
              { category: { name: { contains: search } } },
              { customer: { accountNumber: { contains: search } } },
              { customer: { firstName: { contains: search } } },
              { customer: { lastName: { contains: search } } },
              { customer: { businessName: { contains: search } } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.includeRelations(),
      }),
      this.prisma.ticket.count({ where }),
    ]);
    return { items, meta: { total, page, limit } };
  }

  async findOne(id: number) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, deletedAt: null },
      include: this.includeRelations(),
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async update(id: number, dto: UpdateTicketDto) {
    await this.findOne(id);
    if (dto.categoryId || dto.customerId || dto.subscriptionId) {
      await this.ensureLookups(dto.categoryId, dto.customerId ?? undefined, dto.subscriptionId ?? undefined);
    }
    return this.prisma.ticket.update({
      where: { id },
      data: {
        ...dto,
        dueAt: this.toDateOrNull(dto.dueAt),
        resolvedAt: dto.status === 'resolved' ? new Date() : undefined,
      },
      include: this.includeRelations(),
    });
  }

  async resolve(id: number, resolution?: string) {
    await this.findOne(id);
    return this.prisma.ticket.update({
      where: { id },
      data: { status: 'resolved', resolution: resolution || null, resolvedAt: new Date() },
      include: this.includeRelations(),
    });
  }

  async close(id: number) {
    await this.findOne(id);
    return this.prisma.ticket.update({
      where: { id },
      data: { status: 'closed' },
      include: this.includeRelations(),
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.ticket.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: this.includeRelations(),
    });
  }

  private async ensureLookups(categoryId?: number, customerId?: number, subscriptionId?: number) {
    if (categoryId) {
      const category = await this.prisma.ticketCategory.findFirst({ where: { id: categoryId, deletedAt: null } });
      if (!category) throw new NotFoundException('Ticket category not found');
    }
    if (customerId) {
      const customer = await this.prisma.customer.findFirst({ where: { id: customerId, deletedAt: null } });
      if (!customer) throw new NotFoundException('Customer not found');
    }
    if (subscriptionId) {
      const subscription = await this.prisma.subscription.findFirst({ where: { id: subscriptionId } });
      if (!subscription) throw new NotFoundException('Subscription not found');
    }
  }

  private toDateOrNull(value?: string | null) {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    return new Date(value);
  }

  private includeRelations() {
    return {
      category: { select: { id: true, code: true, name: true } },
      customer: {
        select: { id: true, accountNumber: true, firstName: true, lastName: true, businessName: true, mobileNumber: true },
      },
      subscription: { select: { id: true, status: true } },
      assignments: {
        where: { deletedAt: null },
        include: { technician: { select: { id: true, name: true, email: true, mobileNumber: true } } },
      },
    };
  }
}
