import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InstallationRequestStatus } from '@prisma/client';
import { getPagination } from '../common/pagination';
import { resolveStaffAssignment, STAFF_ROLES } from '../common/staff-role';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInstallationRequestDto } from './dto/create-installation-request.dto';
import { ListInstallationRequestsQueryDto } from './dto/list-installation-requests-query.dto';
import { UpdateInstallationRequestDto } from './dto/update-installation-request.dto';

@Injectable()
export class InstallationRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateInstallationRequestDto) {
    await this.ensureCustomerExists(dto.customerId);
    if (dto.servicePlanId) await this.ensureServicePlanExists(dto.servicePlanId);

    const status = dto.status ?? InstallationRequestStatus.pending;
    const installerAssignment = await resolveStaffAssignment(
      this.prisma,
      dto.assignedInstallerUserId,
      STAFF_ROLES.INSTALLER,
    );

    return this.prisma.installationRequest.create({
      data: {
        customerId: dto.customerId,
        servicePlanId: dto.servicePlanId,
        status,
        priority: dto.priority,
        requestedDate: dto.requestedDate ? new Date(dto.requestedDate) : undefined,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,
        completedAt:
          dto.completedAt || status === InstallationRequestStatus.completed
            ? new Date(dto.completedAt ?? Date.now())
            : null,
        assignedInstallerName:
          installerAssignment === undefined
            ? dto.assignedInstallerName
            : installerAssignment.name,
        assignedInstallerUserId:
          installerAssignment === undefined
            ? dto.assignedInstallerUserId
            : installerAssignment.userId,
        contactNumber: dto.contactNumber,
        installationAddress: dto.installationAddress,
        mapLocation: dto.mapLocation,
        notes: dto.notes,
      },
      include: this.includeRelations(),
    });
  }

  async findAll(query: ListInstallationRequestsQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const search = query.search?.trim();
    const status = query.status ?? (query.filter as InstallationRequestStatus | undefined);

    const where = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(search
        ? {
            OR: [
              { assignedInstallerName: { contains: search } },
              { assignedInstaller: { name: { contains: search } } },
              { assignedInstaller: { email: { contains: search } } },
              { contactNumber: { contains: search } },
              { installationAddress: { contains: search } },
              { mapLocation: { contains: search } },
              {
                customer: {
                  OR: [
                    { firstName: { contains: search } },
                    { lastName: { contains: search } },
                    { businessName: { contains: search } },
                    { accountNumber: { contains: search } },
                  ],
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.installationRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.includeRelations(),
      }),
      this.prisma.installationRequest.count({ where }),
    ]);

    return { items, meta: { total, page, limit } };
  }

  async findOne(id: number) {
    const request = await this.prisma.installationRequest.findFirst({
      where: { id, deletedAt: null },
      include: this.includeRelations(),
    });

    if (!request) {
      throw new NotFoundException('Installation request not found');
    }

    return request;
  }

  async update(id: number, dto: UpdateInstallationRequestDto) {
    const current = await this.findOne(id);

    if (dto.customerId !== undefined) await this.ensureCustomerExists(dto.customerId);
    if (dto.servicePlanId) await this.ensureServicePlanExists(dto.servicePlanId);

    const status = dto.status ?? current.status;
    const installerAssignment = await resolveStaffAssignment(
      this.prisma,
      dto.assignedInstallerUserId,
      STAFF_ROLES.INSTALLER,
    );

    return this.prisma.installationRequest.update({
      where: { id },
      data: {
        customerId: dto.customerId,
        servicePlanId: dto.servicePlanId,
        status: dto.status,
        priority: dto.priority,
        requestedDate: dto.requestedDate ? new Date(dto.requestedDate) : undefined,
        scheduledDate:
          dto.scheduledDate === null
            ? null
            : dto.scheduledDate
              ? new Date(dto.scheduledDate)
              : undefined,
        completedAt:
          dto.completedAt === null
            ? null
            : dto.completedAt
              ? new Date(dto.completedAt)
              : dto.status === InstallationRequestStatus.completed && !current.completedAt
                ? new Date()
                : undefined,
        ...(installerAssignment !== undefined
          ? {
              assignedInstallerUserId: installerAssignment.userId,
              assignedInstallerName: installerAssignment.name,
            }
          : { assignedInstallerName: dto.assignedInstallerName }),
        contactNumber: dto.contactNumber,
        installationAddress: dto.installationAddress,
        mapLocation: dto.mapLocation,
        notes: dto.notes,
      },
      include: this.includeRelations(),
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.installationRequest.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: this.includeRelations(),
    });
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
          email: true,
          status: true,
        },
      },
      servicePlan: {
        select: {
          id: true,
          code: true,
          name: true,
          monthlyPrice: true,
          downloadMbps: true,
          uploadMbps: true,
          isActive: true,
        },
      },
      assignedInstaller: {
        select: {
          id: true,
          name: true,
          email: true,
          mobileNumber: true,
        },
      },
    };
  }

  private async ensureCustomerExists(customerId: number) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, deletedAt: null },
    });

    if (!customer) throw new NotFoundException('Customer not found');
  }

  private async ensureServicePlanExists(servicePlanId: number) {
    const servicePlan = await this.prisma.servicePlan.findFirst({
      where: { id: servicePlanId, deletedAt: null },
    });

    if (!servicePlan) throw new NotFoundException('Service plan not found');
    if (!servicePlan.isActive) throw new BadRequestException('Service plan is not active');
  }
}
