import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import { getPagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { ListSubscriptionsQueryDto } from './dto/list-subscriptions-query.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSubscriptionDto) {
    await this.ensureCustomerExists(dto.customerId);
    await this.ensureServicePlanExists(dto.servicePlanId);
    if (dto.pppoeAccountId) {
      await this.ensurePppoeAccountMatchesSubscription(
        dto.pppoeAccountId,
        dto.customerId,
        dto.servicePlanId,
      );
    }

    const status = dto.status ?? SubscriptionStatus.active;
    if (status === SubscriptionStatus.active) {
      await this.ensureNoActiveSubscription(dto.customerId);
    }

    return this.prisma.subscription.create({
      data: {
        customerId: dto.customerId,
        servicePlanId: dto.servicePlanId,
        pppoeAccountId: dto.pppoeAccountId,
        billingDay: dto.billingDay,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        status,
        autoSuspendEnabled: dto.autoSuspendEnabled ?? true,
        gracePeriodDays: dto.gracePeriodDays ?? 7,
      },
      include: this.includeRelations(),
    });
  }

  async findAll(query: ListSubscriptionsQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const status = query.status ?? (query.filter as SubscriptionStatus | undefined);
    const customerSearch = query.search?.trim();

    const where = {
      ...(status ? { status } : {}),
      ...(query.servicePlanId ? { servicePlanId: query.servicePlanId } : {}),
      ...(customerSearch
        ? {
            customer: {
              deletedAt: null,
              OR: [
                { firstName: { contains: customerSearch } },
                { lastName: { contains: customerSearch } },
                { businessName: { contains: customerSearch } },
                { accountNumber: { contains: customerSearch } },
              ],
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.includeRelations(),
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return { items, meta: { total, page, limit } };
  }

  async findOne(id: number) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: this.includeRelations(),
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  async update(id: number, dto: UpdateSubscriptionDto) {
    const current = await this.findOne(id);

    if (dto.customerId !== undefined) {
      await this.ensureCustomerExists(dto.customerId);
    }

    if (dto.servicePlanId !== undefined) {
      await this.ensureServicePlanExists(dto.servicePlanId);
    }

    const nextStatus = dto.status ?? current.status;
    const nextCustomerId = dto.customerId ?? current.customerId;
    const nextServicePlanId = dto.servicePlanId ?? current.servicePlanId;

    if (nextStatus === SubscriptionStatus.active) {
      await this.ensureNoActiveSubscription(nextCustomerId, id);
    }

    if (dto.pppoeAccountId) {
      await this.ensurePppoeAccountMatchesSubscription(
        dto.pppoeAccountId,
        nextCustomerId,
        nextServicePlanId,
      );
    }

    return this.prisma.subscription.update({
      where: { id },
      data: {
        customerId: dto.customerId,
        servicePlanId: dto.servicePlanId,
        pppoeAccountId: dto.pppoeAccountId,
        billingDay: dto.billingDay,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate:
          dto.endDate === null
            ? null
            : dto.endDate
              ? new Date(dto.endDate)
              : undefined,
        status: dto.status,
        autoSuspendEnabled: dto.autoSuspendEnabled,
        gracePeriodDays: dto.gracePeriodDays,
      },
      include: this.includeRelations(),
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.subscription.delete({
      where: { id },
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
      pppoeAccount: {
        select: {
          id: true,
          username: true,
          profileName: true,
          remoteAddress: true,
          status: true,
          router: {
            select: {
              id: true,
              name: true,
              host: true,
            },
          },
        },
      },
    };
  }

  private async ensureCustomerExists(customerId: number) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, deletedAt: null },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
  }

  private async ensureServicePlanExists(servicePlanId: number) {
    const servicePlan = await this.prisma.servicePlan.findFirst({
      where: { id: servicePlanId, deletedAt: null },
    });

    if (!servicePlan) {
      throw new NotFoundException('Service plan not found');
    }

    if (!servicePlan.isActive) {
      throw new BadRequestException('Service plan is not active');
    }
  }

  private async ensureNoActiveSubscription(
    customerId: number,
    excludeSubscriptionId?: number,
  ) {
    const existing = await this.prisma.subscription.findFirst({
      where: {
        customerId,
        status: SubscriptionStatus.active,
        ...(excludeSubscriptionId
          ? { id: { not: excludeSubscriptionId } }
          : {}),
      },
    });

    if (existing) {
      throw new ConflictException(
        'Customer already has an active subscription',
      );
    }
  }

  private async ensurePppoeAccountMatchesSubscription(
    pppoeAccountId: number,
    customerId: number,
    servicePlanId: number,
  ) {
    const account = await this.prisma.pppoeAccount.findUnique({
      where: { id: pppoeAccountId },
      select: {
        customerId: true,
        servicePlanId: true,
      },
    });

    if (!account) {
      throw new NotFoundException('PPPoE account not found');
    }

    if (account.customerId !== customerId) {
      throw new BadRequestException(
        'PPPoE account must belong to the selected customer',
      );
    }

    if (account.servicePlanId !== servicePlanId) {
      throw new BadRequestException(
        'PPPoE account must use the selected service plan',
      );
    }
  }
}
