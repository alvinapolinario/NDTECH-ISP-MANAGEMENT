import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProjectEstimateStatus } from '@prisma/client';
import { getPagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectEstimateDto } from './dto/create-project-estimate.dto';
import { ListProjectEstimatesQueryDto } from './dto/list-project-estimates-query.dto';
import { ProjectEstimateItemDto } from './dto/project-estimate-item.dto';
import { UpdateProjectEstimateDto } from './dto/update-project-estimate.dto';

@Injectable()
export class ProjectEstimatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProjectEstimateDto) {
    if (!dto.items?.length) throw new BadRequestException('At least one estimate item is required');
    await this.ensureProject(dto.projectId);
    await this.ensureItems(dto.items);
    return this.prisma.projectEstimate.create({
      data: {
        projectId: dto.projectId,
        estimateNumber: dto.estimateNumber || `EST-${Date.now().toString().slice(-8)}`,
        status: dto.status,
        validUntil: this.toDateOrNull(dto.validUntil),
        laborCost: dto.laborCost,
        overheadCost: dto.overheadCost,
        notes: dto.notes,
        items: { create: dto.items.map((item) => this.toItemCreate(item)) },
      },
      include: this.includeRelations(),
    });
  }

  async findAll(query: ListProjectEstimatesQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const status = query.status ?? (query.filter as ProjectEstimateStatus | undefined);
    const search = query.search?.trim();
    const where: Prisma.ProjectEstimateWhereInput = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(search ? { OR: [{ estimateNumber: { contains: search } }, { project: { code: { contains: search } } }, { project: { name: { contains: search } } }, { notes: { contains: search } }] } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.projectEstimate.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: this.includeRelations() }),
      this.prisma.projectEstimate.count({ where }),
    ]);
    return { items, meta: { total, page, limit } };
  }

  async findOne(id: number) {
    const estimate = await this.prisma.projectEstimate.findFirst({ where: { id, deletedAt: null }, include: this.includeRelations() });
    if (!estimate) throw new NotFoundException('Project estimate not found');
    return estimate;
  }

  async update(id: number, dto: UpdateProjectEstimateDto) {
    await this.findOne(id);
    if (dto.projectId) await this.ensureProject(dto.projectId);
    if (dto.items) {
      if (!dto.items.length) throw new BadRequestException('At least one estimate item is required');
      await this.ensureItems(dto.items);
    }
    return this.prisma.$transaction(async (tx) => {
      if (dto.items) await tx.projectEstimateItem.deleteMany({ where: { estimateId: id } });
      return tx.projectEstimate.update({
        where: { id },
        data: {
          projectId: dto.projectId,
          estimateNumber: dto.estimateNumber,
          status: dto.status,
          validUntil: this.toDateOrNull(dto.validUntil),
          laborCost: dto.laborCost,
          overheadCost: dto.overheadCost,
          notes: dto.notes,
          items: dto.items ? { create: dto.items.map((item) => this.toItemCreate(item)) } : undefined,
        },
        include: this.includeRelations(),
      });
    });
  }

  async setStatus(id: number, status: ProjectEstimateStatus) {
    await this.findOne(id);
    return this.prisma.projectEstimate.update({ where: { id }, data: { status }, include: this.includeRelations() });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.projectEstimate.update({ where: { id }, data: { deletedAt: new Date() }, include: this.includeRelations() });
  }

  private async ensureProject(projectId: number) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, deletedAt: null } });
    if (!project) throw new NotFoundException('Project not found');
  }

  private async ensureItems(items: ProjectEstimateItemDto[]) {
    const ids = [...new Set(items.map((item) => item.itemId).filter((id): id is number => Boolean(id)))];
    if (!ids.length) return;
    const count = await this.prisma.inventoryItem.count({ where: { id: { in: ids }, deletedAt: null } });
    if (count !== ids.length) throw new NotFoundException('One or more inventory items were not found');
  }

  private toItemCreate(item: ProjectEstimateItemDto) {
    return { itemId: item.itemId, description: item.description, quantity: item.quantity, unit: item.unit, unitCost: item.unitCost, notes: item.notes };
  }

  private toDateOrNull(value?: string | null) {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    return new Date(value);
  }

  private includeRelations() {
    return {
      project: { select: { id: true, code: true, name: true, status: true } },
      items: { include: { item: { select: { id: true, code: true, name: true, unit: true } } } },
    };
  }
}
