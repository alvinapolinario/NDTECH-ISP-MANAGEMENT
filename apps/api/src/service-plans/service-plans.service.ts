import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { getPagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServicePlanDto } from './dto/create-service-plan.dto';
import { UpdateServicePlanDto } from './dto/update-service-plan.dto';

@Injectable()
export class ServicePlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateServicePlanDto) {
    try {
      return await this.prisma.servicePlan.create({ data: dto });
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
      this.prisma.servicePlan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.servicePlan.count({ where }),
    ]);

    return { items, meta: { total, page, limit } };
  }

  async findOne(id: number) {
    const plan = await this.prisma.servicePlan.findFirst({
      where: { id, deletedAt: null },
    });

    if (!plan) {
      throw new NotFoundException('Service plan not found');
    }

    return plan;
  }

  async update(id: number, dto: UpdateServicePlanDto) {
    await this.findOne(id);

    try {
      return await this.prisma.servicePlan.update({ where: { id }, data: dto });
    } catch (error) {
      this.rethrowUniqueCodeConflict(error);
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.servicePlan.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private rethrowUniqueCodeConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Service plan code already exists');
    }

    throw error;
  }
}
