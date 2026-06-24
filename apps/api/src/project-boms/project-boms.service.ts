import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProjectBomStatus } from '@prisma/client';
import { getPagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectBomDto } from './dto/create-project-bom.dto';
import { ListProjectBomsQueryDto } from './dto/list-project-boms-query.dto';
import { ProjectBomItemDto } from './dto/project-bom-item.dto';
import { UpdateProjectBomDto } from './dto/update-project-bom.dto';

@Injectable()
export class ProjectBomsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProjectBomDto) {
    if (!dto.items?.length) throw new BadRequestException('At least one BOM item is required');
    await this.ensureProject(dto.projectId);
    await this.ensureItems(dto.items);
    return this.prisma.projectBom.create({
      data: {
        projectId: dto.projectId,
        bomNumber: dto.bomNumber || `BOM-${Date.now().toString().slice(-8)}`,
        status: dto.status,
        notes: dto.notes,
        items: { create: dto.items },
      },
      include: this.includeRelations(),
    });
  }

  async findAll(query: ListProjectBomsQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const status = query.status ?? (query.filter as ProjectBomStatus | undefined);
    const search = query.search?.trim();
    const where: Prisma.ProjectBomWhereInput = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(search ? { OR: [{ bomNumber: { contains: search } }, { project: { code: { contains: search } } }, { project: { name: { contains: search } } }, { notes: { contains: search } }] } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.projectBom.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: this.includeRelations() }),
      this.prisma.projectBom.count({ where }),
    ]);
    return { items, meta: { total, page, limit } };
  }

  async findOne(id: number) {
    const bom = await this.prisma.projectBom.findFirst({ where: { id, deletedAt: null }, include: this.includeRelations() });
    if (!bom) throw new NotFoundException('Project BOM not found');
    return bom;
  }

  async update(id: number, dto: UpdateProjectBomDto) {
    await this.findOne(id);
    if (dto.projectId) await this.ensureProject(dto.projectId);
    if (dto.items) {
      if (!dto.items.length) throw new BadRequestException('At least one BOM item is required');
      await this.ensureItems(dto.items);
    }
    return this.prisma.$transaction(async (tx) => {
      if (dto.items) await tx.projectBomItem.deleteMany({ where: { bomId: id } });
      return tx.projectBom.update({
        where: { id },
        data: {
          projectId: dto.projectId,
          bomNumber: dto.bomNumber,
          status: dto.status,
          notes: dto.notes,
          items: dto.items ? { create: dto.items } : undefined,
        },
        include: this.includeRelations(),
      });
    });
  }

  async setStatus(id: number, status: ProjectBomStatus) {
    await this.findOne(id);
    return this.prisma.projectBom.update({ where: { id }, data: { status }, include: this.includeRelations() });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.projectBom.update({ where: { id }, data: { deletedAt: new Date() }, include: this.includeRelations() });
  }

  private async ensureProject(projectId: number) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, deletedAt: null } });
    if (!project) throw new NotFoundException('Project not found');
  }

  private async ensureItems(items: ProjectBomItemDto[]) {
    const ids = [...new Set(items.map((item) => item.itemId))];
    const count = await this.prisma.inventoryItem.count({ where: { id: { in: ids }, deletedAt: null } });
    if (count !== ids.length) throw new NotFoundException('One or more inventory items were not found');
  }

  private includeRelations() {
    return {
      project: { select: { id: true, code: true, name: true, status: true } },
      items: { include: { item: { select: { id: true, code: true, name: true, unit: true } } } },
    };
  }
}
