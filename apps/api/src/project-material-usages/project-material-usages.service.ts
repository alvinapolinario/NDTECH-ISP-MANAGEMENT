import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getPagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectMaterialUsageDto } from './dto/create-project-material-usage.dto';
import { ListProjectMaterialUsagesQueryDto } from './dto/list-project-material-usages-query.dto';

@Injectable()
export class ProjectMaterialUsagesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProjectMaterialUsageDto) {
    if (!dto.items?.length) throw new BadRequestException('At least one material item is required');
    return this.prisma.$transaction(async (tx) => {
      const [project, warehouse] = await Promise.all([
        tx.project.findFirst({ where: { id: dto.projectId, deletedAt: null } }),
        tx.warehouse.findFirst({ where: { id: dto.warehouseId, deletedAt: null } }),
      ]);
      if (!project) throw new NotFoundException('Project not found');
      if (!warehouse) throw new NotFoundException('Warehouse not found');
      const itemIds = [...new Set(dto.items.map((item) => item.itemId))];
      const count = await tx.inventoryItem.count({ where: { id: { in: itemIds }, deletedAt: null } });
      if (count !== itemIds.length) throw new NotFoundException('One or more inventory items were not found');

      const usageNumber = dto.usageNumber || `MU-${Date.now().toString().slice(-8)}`;
      const usage = await tx.projectMaterialUsage.create({
        data: {
          projectId: dto.projectId,
          warehouseId: dto.warehouseId,
          usageNumber,
          usedDate: this.toRequiredDateOrUndefined(dto.usedDate),
          usedBy: dto.usedBy,
          notes: dto.notes,
          items: { create: dto.items },
        },
        include: this.includeRelations(),
      });

      for (const item of dto.items) {
        await this.adjustStock(tx, item.itemId, dto.warehouseId, -item.quantity);
        await tx.inventoryMovement.create({
          data: {
            itemId: item.itemId,
            warehouseId: dto.warehouseId,
            movementType: 'stock_out',
            quantity: item.quantity,
            unitCost: item.unitCost,
            referenceType: 'project_material_usage',
            referenceNo: usageNumber,
            notes: dto.notes,
          },
        });
      }

      return usage;
    });
  }

  async findAll(query: ListProjectMaterialUsagesQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const search = query.search?.trim();
    const where: Prisma.ProjectMaterialUsageWhereInput = {
      deletedAt: null,
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(search ? { OR: [{ usageNumber: { contains: search } }, { usedBy: { contains: search } }, { project: { code: { contains: search } } }, { project: { name: { contains: search } } }, { warehouse: { name: { contains: search } } }] } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.projectMaterialUsage.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: this.includeRelations() }),
      this.prisma.projectMaterialUsage.count({ where }),
    ]);
    return { items, meta: { total, page, limit } };
  }

  async findOne(id: number) {
    const usage = await this.prisma.projectMaterialUsage.findFirst({ where: { id, deletedAt: null }, include: this.includeRelations() });
    if (!usage) throw new NotFoundException('Project material usage not found');
    return usage;
  }

  private async adjustStock(tx: Prisma.TransactionClient, itemId: number, warehouseId: number, delta: number) {
    const stock = await tx.inventoryStock.upsert({
      where: { itemId_warehouseId: { itemId, warehouseId } },
      update: {},
      create: { itemId, warehouseId, quantity: 0 },
    });
    const nextQuantity = Number(stock.quantity) + delta;
    if (nextQuantity < 0) throw new BadRequestException('Insufficient stock for project material usage');
    return tx.inventoryStock.update({ where: { id: stock.id }, data: { quantity: nextQuantity } });
  }

  private toRequiredDateOrUndefined(value?: string | null) {
    if (value === undefined || value === null || value === '') return undefined;
    return new Date(value);
  }

  private includeRelations() {
    return {
      project: { select: { id: true, code: true, name: true, status: true } },
      warehouse: { select: { id: true, code: true, name: true } },
      items: { include: { item: { select: { id: true, code: true, name: true, unit: true } } } },
    };
  }
}
