import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProjectStatus, ProjectType } from '@prisma/client';
import { getPagination } from '../common/pagination';
import {
  assertActiveStaffRole,
  isOutsourcedProjectType,
  resolveStaffAssignment,
  STAFF_ROLES,
} from '../common/staff-role';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsQueryDto } from './dto/list-projects-query.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProjectDto) {
    if (dto.customerId) await this.ensureCustomer(dto.customerId);

    const projectType = dto.projectType ?? ProjectType.expansion;
    const contractorUserId = await this.resolveContractorUserId(
      projectType,
      dto.contractorUserId,
    );

    return this.prisma.project.create({
      data: {
        code: dto.code || `PRJ-${Date.now().toString().slice(-8)}`,
        name: dto.name,
        description: dto.description,
        projectType,
        status: dto.status,
        customerId: dto.customerId,
        location: dto.location,
        startDate: this.toDateOrNull(dto.startDate),
        targetDate: this.toDateOrNull(dto.targetDate),
        budget: dto.budget,
        managerName: dto.managerName,
        contractorUserId,
        notes: dto.notes,
      },
      include: this.includeRelations(),
    });
  }

  async findAll(query: ListProjectsQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const status = query.status ?? (query.filter as ProjectStatus | undefined);
    const search = query.search?.trim();
    const where: Prisma.ProjectWhereInput = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(query.projectType ? { projectType: query.projectType as ProjectType } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search } },
              { name: { contains: search } },
              { description: { contains: search } },
              { managerName: { contains: search } },
              { location: { contains: search } },
              { contractor: { name: { contains: search } } },
              { contractor: { email: { contains: search } } },
              { customer: { accountNumber: { contains: search } } },
              { customer: { firstName: { contains: search } } },
              { customer: { lastName: { contains: search } } },
              { customer: { businessName: { contains: search } } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.includeRelations(),
      }),
      this.prisma.project.count({ where }),
    ]);
    return { items, meta: { total, page, limit } };
  }

  async findOne(id: number) {
    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: this.includeRelations(),
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async update(id: number, dto: UpdateProjectDto) {
    const current = await this.findOne(id);
    if (dto.customerId) await this.ensureCustomer(dto.customerId);

    const projectType = dto.projectType ?? current.projectType;
    const contractorUserId = await this.resolveContractorUserId(
      projectType,
      dto.contractorUserId !== undefined
        ? dto.contractorUserId
        : isOutsourcedProjectType(projectType)
          ? current.contractorUserId
          : null,
    );

    return this.prisma.project.update({
      where: { id },
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        projectType: dto.projectType,
        status: dto.status,
        customerId: dto.customerId,
        location: dto.location,
        startDate: this.toDateOrNull(dto.startDate),
        targetDate: this.toDateOrNull(dto.targetDate),
        completedAt: this.toDateOrNull(dto.completedAt),
        budget: dto.budget,
        managerName: dto.managerName,
        contractorUserId,
        notes: dto.notes,
      },
      include: this.includeRelations(),
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: this.includeRelations(),
    });
  }

  private async resolveContractorUserId(
    projectType: ProjectType,
    contractorUserId?: number | null,
  ) {
    if (isOutsourcedProjectType(projectType)) {
      if (!contractorUserId) {
        throw new BadRequestException(
          'Contractor is required for CCTV, Solar, and outsourced projects',
        );
      }

      const contractor = await assertActiveStaffRole(
        this.prisma,
        contractorUserId,
        STAFF_ROLES.CONTRACTOR,
      );
      return contractor.id;
    }

    if (contractorUserId === undefined) {
      return null;
    }

    if (contractorUserId === null) {
      return null;
    }

    const contractor = await assertActiveStaffRole(
      this.prisma,
      contractorUserId,
      STAFF_ROLES.CONTRACTOR,
    );
    return contractor.id;
  }

  private async ensureCustomer(customerId: number) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, deletedAt: null },
    });
    if (!customer) throw new NotFoundException('Customer not found');
  }

  private toDateOrNull(value?: string | null) {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    return new Date(value);
  }

  private includeRelations() {
    return {
      customer: {
        select: {
          id: true,
          accountNumber: true,
          firstName: true,
          lastName: true,
          businessName: true,
          mobileNumber: true,
        },
      },
      contractor: {
        select: {
          id: true,
          name: true,
          email: true,
          mobileNumber: true,
        },
      },
      _count: { select: { estimates: true, boms: true, materialUsages: true } },
    };
  }
}
