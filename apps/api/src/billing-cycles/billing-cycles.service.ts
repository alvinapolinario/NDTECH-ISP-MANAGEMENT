import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BillingCycleStatus, Prisma } from '@prisma/client';
import { getPagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBillingCycleDto } from './dto/create-billing-cycle.dto';
import { ListBillingCyclesQueryDto } from './dto/list-billing-cycles-query.dto';
import { UpdateBillingCycleDto } from './dto/update-billing-cycle.dto';

@Injectable()
export class BillingCyclesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBillingCycleDto) {
    this.ensureValidDates(dto.periodStart, dto.periodEnd, dto.dueDate);

    try {
      return await this.prisma.billingCycle.create({
        data: {
          name: dto.name,
          periodStart: new Date(dto.periodStart),
          periodEnd: new Date(dto.periodEnd),
          dueDate: new Date(dto.dueDate),
          status: dto.status,
          notes: dto.notes,
        },
      });
    } catch (error) {
      this.rethrowUniquePeriodConflict(error);
    }
  }

  async findAll(query: ListBillingCyclesQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const status = query.status ?? (query.filter as BillingCycleStatus | undefined);
    const search = query.search?.trim();

    const where = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { notes: { contains: search } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.billingCycle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { periodStart: 'desc' },
      }),
      this.prisma.billingCycle.count({ where }),
    ]);

    return { items, meta: { total, page, limit } };
  }

  async findOne(id: number) {
    const cycle = await this.prisma.billingCycle.findFirst({
      where: { id, deletedAt: null },
    });

    if (!cycle) {
      throw new NotFoundException('Billing cycle not found');
    }

    return cycle;
  }

  async update(id: number, dto: UpdateBillingCycleDto) {
    const current = await this.findOne(id);
    const periodStart = dto.periodStart ?? current.periodStart.toISOString();
    const periodEnd = dto.periodEnd ?? current.periodEnd.toISOString();
    const dueDate = dto.dueDate ?? current.dueDate.toISOString();
    this.ensureValidDates(periodStart, periodEnd, dueDate);

    try {
      return await this.prisma.billingCycle.update({
        where: { id },
        data: {
          name: dto.name,
          periodStart: dto.periodStart ? new Date(dto.periodStart) : undefined,
          periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : undefined,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          status: dto.status,
          notes: dto.notes,
        },
      });
    } catch (error) {
      this.rethrowUniquePeriodConflict(error);
    }
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.billingCycle.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private ensureValidDates(
    periodStartValue: string,
    periodEndValue: string,
    dueDateValue: string,
  ) {
    const periodStart = new Date(periodStartValue);
    const periodEnd = new Date(periodEndValue);
    const dueDate = new Date(dueDateValue);

    if (periodEnd < periodStart) {
      throw new BadRequestException('Period end must be after period start');
    }

    if (dueDate < periodStart) {
      throw new BadRequestException('Due date must be on or after period start');
    }
  }

  private rethrowUniquePeriodConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Billing cycle already exists for this period',
      );
    }

    throw error;
  }
}
