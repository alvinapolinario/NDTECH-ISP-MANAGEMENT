import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProjectCostingStatus } from '@prisma/client';
import { getPagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectCostingDto } from './dto/create-project-costing.dto';
import { ListProjectCostingsQueryDto } from './dto/list-project-costings-query.dto';
import { UpdateProjectCostingDto } from './dto/update-project-costing.dto';

@Injectable()
export class ProjectCostingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProjectCostingDto) {
    await this.ensureProject(dto.projectId);
    const costing = await this.prisma.projectCosting.create({ data: dto, include: this.includeRelations() });
    return this.withComputedTotals(costing);
  }

  async findAll(query: ListProjectCostingsQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const status = query.status ?? (query.filter as ProjectCostingStatus | undefined);
    const search = query.search?.trim();
    const where: Prisma.ProjectCostingWhereInput = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(search ? { OR: [{ project: { code: { contains: search } } }, { project: { name: { contains: search } } }, { notes: { contains: search } }] } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.projectCosting.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: this.includeRelations() }),
      this.prisma.projectCosting.count({ where }),
    ]);
    return { items: await Promise.all(items.map((item) => this.withComputedTotals(item))), meta: { total, page, limit } };
  }

  async findOne(id: number) {
    const costing = await this.prisma.projectCosting.findFirst({ where: { id, deletedAt: null }, include: this.includeRelations() });
    if (!costing) throw new NotFoundException('Project costing not found');
    return this.withComputedTotals(costing);
  }

  async update(id: number, dto: UpdateProjectCostingDto) {
    await this.findOne(id);
    if (dto.projectId) await this.ensureProject(dto.projectId);
    const costing = await this.prisma.projectCosting.update({ where: { id }, data: dto, include: this.includeRelations() });
    return this.withComputedTotals(costing);
  }

  async setStatus(id: number, status: ProjectCostingStatus) {
    await this.findOne(id);
    const costing = await this.prisma.projectCosting.update({ where: { id }, data: { status }, include: this.includeRelations() });
    return this.withComputedTotals(costing);
  }

  async remove(id: number) {
    await this.findOne(id);
    const costing = await this.prisma.projectCosting.update({ where: { id }, data: { deletedAt: new Date() }, include: this.includeRelations() });
    return this.withComputedTotals(costing);
  }

  private async ensureProject(projectId: number) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, deletedAt: null } });
    if (!project) throw new NotFoundException('Project not found');
  }

  private async withComputedTotals<T extends { projectId: number; laborCost: unknown; overheadCost: unknown; otherCost: unknown }>(costing: T) {
    const usages = await this.prisma.projectMaterialUsage.findMany({
      where: { projectId: costing.projectId, deletedAt: null },
      include: { items: true },
    });
    const materialCost = usages.reduce(
      (total, usage) => total + usage.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitCost), 0),
      0,
    );
    const totalCost = materialCost + Number(costing.laborCost) + Number(costing.overheadCost) + Number(costing.otherCost);
    return { ...costing, materialCost, totalCost };
  }

  private includeRelations() {
    return { project: { select: { id: true, code: true, name: true, status: true, budget: true } } };
  }
}
