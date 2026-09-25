import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { getPagination } from '../common/pagination';
import { resolvePlanPppProfileName } from '../mikrotik/mikrotik-profile.config';
import { PrismaService } from '../prisma/prisma.service';
import { RadiusProfilesService } from '../radius/radius-profiles.service';
import { CreateServicePlanDto } from './dto/create-service-plan.dto';
import { UpdateServicePlanDto } from './dto/update-service-plan.dto';

type PlanSpeedLink = {
  id: number;
  code: string;
  name: string;
  pppoeProfileName: string | null;
  downloadMbps: number;
  uploadMbps: number;
};

@Injectable()
export class ServicePlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly radiusProfiles: RadiusProfilesService,
  ) {}

  async create(dto: CreateServicePlanDto) {
    const code = dto.code.trim();
    const softDeleted = await this.prisma.servicePlan.findFirst({
      where: { code, deletedAt: { not: null } },
    });

    // Soft-deleted plans still held the unique code; revive that row instead.
    if (softDeleted) {
      return this.prisma.servicePlan.update({
        where: { id: softDeleted.id },
        data: {
          ...dto,
          code,
          deletedAt: null,
        },
      });
    }

    try {
      return await this.prisma.servicePlan.create({
        data: { ...dto, code },
      });
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

    const data =
      dto.code !== undefined ? { ...dto, code: dto.code.trim() } : dto;

    if (data.code) {
      const softDeleted = await this.prisma.servicePlan.findFirst({
        where: {
          code: data.code,
          deletedAt: { not: null },
          NOT: { id },
        },
      });
      if (softDeleted) {
        await this.prisma.servicePlan.update({
          where: { id: softDeleted.id },
          data: {
            code: `${softDeleted.code}__deleted__${softDeleted.id}`,
          },
        });
      }
    }

    try {
      return await this.prisma.servicePlan.update({ where: { id }, data });
    } catch (error) {
      this.rethrowUniqueCodeConflict(error);
    }
  }

  async remove(id: number) {
    const plan = await this.findOne(id);
    return this.prisma.servicePlan.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        // Release unique code so a new plan can reuse it.
        code: `${plan.code}__deleted__${plan.id}`,
      },
    });
  }

  async listRadiusProfiles() {
    if (!process.env.RADIUS_DB_HOST?.trim()) {
      return { items: [], source: 'unconfigured' as const };
    }

    const [profiles, plans] = await Promise.all([
      this.radiusProfiles.listProfiles(),
      this.prisma.servicePlan.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          code: true,
          name: true,
          pppoeProfileName: true,
          downloadMbps: true,
          uploadMbps: true,
        },
        orderBy: { code: 'asc' },
      }),
    ]);

    const items = profiles.map((profile) => {
      const linkedServicePlan = this.findLinkedPlan(profile.groupname, plans);
      const syncStatus = this.resolveSyncStatus(profile, linkedServicePlan);
      return {
        groupname: profile.groupname,
        displayName: profile.displayName,
        rateLimit: profile.rateLimit,
        downloadMbps: profile.downloadMbps,
        uploadMbps: profile.uploadMbps,
        dataCapMb: profile.dataCapMb,
        fupEnabled: profile.fupEnabled,
        fupThresholdMb: profile.fupThresholdMb,
        fupRateLimit: profile.fupRateLimit,
        subscriberCount: profile.subscriberCount,
        attributeCount: profile.attributeCount,
        syncStatus,
        linkedServicePlan,
      };
    });

    return { items, source: 'radius' as const };
  }

  private findLinkedPlan(groupname: string, plans: PlanSpeedLink[]) {
    return (
      plans.find(
        (plan) => resolvePlanPppProfileName(plan) === groupname.trim(),
      ) ?? null
    );
  }

  private resolveSyncStatus(
    profile: {
      downloadMbps?: number | null;
      uploadMbps?: number | null;
    },
    linkedServicePlan: PlanSpeedLink | null,
  ) {
    if (!linkedServicePlan) {
      return 'unlinked' as const;
    }
    if (
      profile.downloadMbps != null &&
      profile.uploadMbps != null &&
      (linkedServicePlan.downloadMbps !== profile.downloadMbps ||
        linkedServicePlan.uploadMbps !== profile.uploadMbps)
    ) {
      return 'speed_mismatch' as const;
    }
    return 'linked' as const;
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
