import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PppoeAccountStatus, SubscriptionStatus } from '@prisma/client';
import { getPagination } from '../common/pagination';
import { SecretCryptoService } from '../mikrotik/crypto/secret-crypto.service';
import { resolvePlanPppProfileName } from '../mikrotik/mikrotik-profile.config';
import { PppoeAccountsService } from '../mikrotik/pppoe-accounts.service';
import { PppoeSessionsService } from '../mikrotik/pppoe-sessions.service';
import { PrismaService } from '../prisma/prisma.service';
import { RadiusProvisionerService } from '../radius/radius-provisioner.service';
import { RadiusSubscribersService } from '../radius/radius-subscribers.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { ListPppoeAccountOptionsQueryDto } from './dto/list-pppoe-account-options-query.dto';
import { ListSubscriptionsQueryDto } from './dto/list-subscriptions-query.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

type PppoeOptionItem = {
  username: string;
  groupname: string | null;
  activeSessions: number;
  lastStart: Date | null;
  pppoeAccountId: number | null;
  customerId: number | null;
  servicePlanId: number | null;
  linkedSubscriptionId: number | null;
  profileName: string | null;
  router: { id: number; name: string; host: string } | null;
  customer: {
    id: number;
    accountNumber: string;
    firstName: string | null;
    lastName: string | null;
    businessName: string | null;
  } | null;
  servicePlan: { id: number; code: string; name: string } | null;
};

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly radiusSubscribers: RadiusSubscribersService,
    private readonly radiusProvisioner: RadiusProvisionerService,
    private readonly secretCrypto: SecretCryptoService,
    private readonly pppoeAccounts: PppoeAccountsService,
    private readonly pppoeSessions: PppoeSessionsService,
  ) {}

  async listPppoeAccountOptions(query: ListPppoeAccountOptionsQueryDto) {
    const groupname = query.servicePlanId
      ? await this.resolvePlanRadiusGroup(query.servicePlanId)
      : undefined;
    const radiusUsers = await this.radiusSubscribers.listSubscribers({
      search: query.search,
      groupname,
      limit: query.limit ?? 100,
    });
    if (!radiusUsers.length) {
      return { items: [], source: 'radius' as const };
    }

    const usernames = radiusUsers.map((user) => user.username);
    const localAccounts = await this.prisma.pppoeAccount.findMany({
      where: { username: { in: usernames } },
      include: {
        customer: {
          select: {
            id: true,
            accountNumber: true,
            firstName: true,
            lastName: true,
            businessName: true,
          },
        },
        servicePlan: {
          select: { id: true, code: true, name: true },
        },
        router: {
          select: { id: true, name: true, host: true },
        },
        subscriptions: {
          select: { id: true, customerId: true },
        },
      },
    });
    const accountByUsername = new Map(
      localAccounts.map((account) => [account.username, account]),
    );
    const items = radiusUsers
      .map((radiusUser) => {
        const local = accountByUsername.get(radiusUser.username);
        const linkedSubscription = local?.subscriptions[0] ?? null;
        return {
          username: radiusUser.username,
          groupname: radiusUser.groupname,
          activeSessions: radiusUser.activeSessions,
          lastStart: radiusUser.lastStart,
          pppoeAccountId: local?.id ?? null,
          customerId: local?.customerId ?? null,
          servicePlanId: local?.servicePlanId ?? null,
          linkedSubscriptionId: linkedSubscription?.id ?? null,
          profileName: local?.profileName ?? radiusUser.groupname ?? null,
          router: local?.router ?? null,
          customer: local?.customer ?? null,
          servicePlan: local?.servicePlan ?? null,
        };
      })
      .filter((item) => this.isEligiblePppoeOption(item, query));

    return { items, source: 'radius' as const };
  }

  async create(dto: CreateSubscriptionDto) {
    await this.ensureCustomerExists(dto.customerId);
    await this.ensureServicePlanExists(dto.servicePlanId);
    const pppoeAccountId =
      dto.pppoeAccountId || dto.radiusUsername
        ? ((await this.resolvePppoeAccountId(
            dto,
            dto.customerId,
            dto.servicePlanId,
          )) ?? undefined)
        : undefined;
    const status = dto.status ?? SubscriptionStatus.active;
    const subscription = await this.prisma.subscription.create({
      data: {
        customerId: dto.customerId,
        servicePlanId: dto.servicePlanId,
        pppoeAccountId,
        label: dto.label?.trim() || null,
        monthlyAmount: dto.monthlyAmount ?? null,
        billingDay: dto.billingDay,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        status,
        autoSuspendEnabled: dto.autoSuspendEnabled ?? true,
        gracePeriodDays: dto.gracePeriodDays ?? 7,
      },
      include: this.includeRelations(),
    });
    await this.syncSubscriptionNetwork(subscription.id, 'subscription_create');
    return this.findOne(subscription.id);
  }

  async findAll(query: ListSubscriptionsQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const status = (query.status ?? query.filter) as
      | SubscriptionStatus
      | undefined;
    const customerSearch = query.search?.trim();
    const where: {
      status?: SubscriptionStatus;
      servicePlanId?: number;
      customer?: {
        deletedAt: null;
        OR: Array<Record<string, { contains: string }>>;
      };
    } = {
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
    const [onuDevices, activeSession] = await Promise.all([
      this.loadOnuDevices(subscription.id, subscription.customerId),
      subscription.pppoeAccountId
        ? this.pppoeSessions.findActiveByAccountId(subscription.pppoeAccountId)
        : Promise.resolve(null),
    ]);
    return {
      ...subscription,
      onuDevices,
      activeSession,
    };
  }

  async update(id: number, dto: UpdateSubscriptionDto) {
    const current = await this.findOne(id);
    if (dto.customerId !== undefined) {
      await this.ensureCustomerExists(dto.customerId);
    }
    if (dto.servicePlanId !== undefined) {
      await this.ensureServicePlanExists(dto.servicePlanId);
    }
    const nextCustomerId = dto.customerId ?? current.customerId;
    const nextServicePlanId = dto.servicePlanId ?? current.servicePlanId;
    const labelData =
      dto.label === undefined
        ? {}
        : { label: dto.label?.trim() ? dto.label.trim() : null };

    const shouldResolvePppoe =
      dto.pppoeAccountId !== undefined || dto.radiusUsername !== undefined;
    if (shouldResolvePppoe) {
      const resolvedPppoeAccountId = await this.resolvePppoeAccountId(
        dto,
        nextCustomerId,
        nextServicePlanId,
        current.pppoeAccountId,
      );
      const updated = await this.prisma.subscription.update({
        where: { id },
        data: {
          customerId: dto.customerId,
          servicePlanId: dto.servicePlanId,
          pppoeAccountId: resolvedPppoeAccountId,
          ...labelData,
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
      await this.syncSubscriptionNetwork(updated.id, 'subscription_update');
      return this.findOne(updated.id);
    }

    const updated = await this.prisma.subscription.update({
      where: { id },
      data: {
        customerId: dto.customerId,
        servicePlanId: dto.servicePlanId,
        pppoeAccountId: dto.pppoeAccountId,
        ...labelData,
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
    await this.syncSubscriptionNetwork(updated.id, 'subscription_update');
    return this.findOne(updated.id);
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

  private async loadOnuDevices(subscriptionId: number, customerId: number) {
    return this.prisma.onuDevice.findMany({
      where: {
        deletedAt: null,
        OR: [{ subscriptionId }, { customerId, subscriptionId: null }],
      },
      orderBy: [{ subscriptionId: 'desc' }, { updatedAt: 'desc' }],
      select: {
        id: true,
        name: true,
        serialNumber: true,
        macAddress: true,
        ponPort: true,
        onuId: true,
        vlan: true,
        profileName: true,
        status: true,
        rxPower: true,
        txPower: true,
        distanceMeters: true,
        location: true,
        lastPolledAt: true,
        subscriptionId: true,
        oltDevice: {
          select: {
            id: true,
            name: true,
            host: true,
            ponTechnology: true,
            status: true,
          },
        },
      },
    });
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

  private async resolvePppoeAccountId(
    dto: CreateSubscriptionDto | UpdateSubscriptionDto,
    customerId: number,
    servicePlanId: number,
    currentPppoeAccountId?: number | null,
    excludeSubscriptionId?: number,
  ) {
    if (dto.pppoeAccountId === null) return null;
    if (dto.pppoeAccountId) {
      await this.ensurePppoeAccountMatchesSubscription(
        dto.pppoeAccountId,
        customerId,
        servicePlanId,
        excludeSubscriptionId,
      );
      return dto.pppoeAccountId;
    }
    const radiusUsername = dto.radiusUsername?.trim();
    if (!radiusUsername) {
      return currentPppoeAccountId;
    }
    return this.ensurePppoeAccountFromRadius(
      radiusUsername,
      customerId,
      servicePlanId,
      excludeSubscriptionId,
    );
  }

  private async ensurePppoeAccountFromRadius(
    username: string,
    customerId: number,
    servicePlanId: number,
    excludeSubscriptionId?: number,
  ) {
    const existing = await this.prisma.pppoeAccount.findFirst({
      where: { username },
      include: { subscriptions: true },
    });
    if (existing) {
      if (existing.customerId && existing.customerId !== customerId) {
        throw new BadRequestException(
          'RADIUS username is already linked to another customer',
        );
      }
      if (
        existing.subscriptions.some(
          (subscription) =>
            subscription.customerId !== customerId ||
            (subscription.status !== SubscriptionStatus.cancelled &&
              subscription.status !== SubscriptionStatus.terminated &&
              subscription.id !== excludeSubscriptionId),
        )
      ) {
        throw new ConflictException(
          'RADIUS username is already linked to another active subscription',
        );
      }
      const plan = await this.prisma.servicePlan.findUnique({
        where: { id: servicePlanId },
      });
      const profileName = plan
        ? resolvePlanPppProfileName(plan)
        : existing.profileName;
      const updated = await this.prisma.pppoeAccount.update({
        where: { id: existing.id },
        data: {
          customerId,
          servicePlanId,
          profileName,
        },
      });
      if (this.radiusProvisioner.isEnabled() && profileName) {
        await this.radiusProvisioner.assignUserGroup(username, profileName);
      }
      return updated.id;
    }

    const [password, routerId, plan] = await Promise.all([
      this.radiusSubscribers.getSubscriberPassword(username),
      this.resolveDefaultRouterId(),
      this.prisma.servicePlan.findUnique({ where: { id: servicePlanId } }),
    ]);
    if (!password) {
      throw new NotFoundException(`RADIUS subscriber ${username} not found`);
    }
    const profileName = plan
      ? resolvePlanPppProfileName(plan)
      : username;
    const created = await this.prisma.pppoeAccount.create({
      data: {
        routerId,
        customerId,
        servicePlanId,
        username,
        passwordEncrypted: this.secretCrypto.encrypt(password),
        profileName,
        status: PppoeAccountStatus.active,
        lastSyncedAt: new Date(),
      },
    });
    if (this.radiusProvisioner.isEnabled() && profileName) {
      await this.radiusProvisioner.assignUserGroup(username, profileName);
    }
    return created.id;
  }

  private async syncSubscriptionNetwork(
    subscriptionId: number,
    triggerSource: string,
  ) {
    try {
      await this.pppoeAccounts.syncFromSubscription(
        subscriptionId,
        triggerSource,
      );
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : 'Unable to provision subscription in RADIUS',
      );
    }
  }

  private async resolveDefaultRouterId() {
    const configured = Number(process.env.RADIUS_DEFAULT_ROUTER_ID ?? 0);
    if (configured > 0) {
      const router = await this.prisma.mikrotikRouter.findUnique({
        where: { id: configured },
      });
      if (router) return router.id;
    }
    const router = await this.prisma.mikrotikRouter.findFirst({
      where: { status: 'active' },
      orderBy: { id: 'asc' },
    });
    if (!router) {
      throw new BadRequestException(
        'No MikroTik router configured for RADIUS-linked PPPoE accounts',
      );
    }
    return router.id;
  }

  private async resolvePlanRadiusGroup(servicePlanId: number) {
    const plan = await this.prisma.servicePlan.findUnique({
      where: { id: servicePlanId },
    });
    if (!plan) return undefined;
    return resolvePlanPppProfileName(plan);
  }

  private isEligiblePppoeOption(
    item: PppoeOptionItem,
    query: ListPppoeAccountOptionsQueryDto,
  ) {
    if (
      query.customerId &&
      item.customerId &&
      item.customerId !== query.customerId
    ) {
      return false;
    }
    if (
      query.servicePlanId &&
      item.servicePlanId &&
      item.servicePlanId !== query.servicePlanId
    ) {
      return false;
    }
    if (
      item.linkedSubscriptionId &&
      item.linkedSubscriptionId !== query.excludeSubscriptionId
    ) {
      return false;
    }
    return true;
  }

  private async ensurePppoeAccountMatchesSubscription(
    pppoeAccountId: number,
    customerId: number,
    servicePlanId: number,
    excludeSubscriptionId?: number,
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
    if (account.customerId !== null && account.customerId !== customerId) {
      throw new BadRequestException(
        'PPPoE account must belong to the selected customer',
      );
    }
    if (
      account.servicePlanId !== null &&
      account.servicePlanId !== servicePlanId
    ) {
      throw new BadRequestException(
        'PPPoE account must use the selected service plan',
      );
    }

    const linked = await this.prisma.subscription.findFirst({
      where: {
        pppoeAccountId,
        status: { in: [SubscriptionStatus.active, SubscriptionStatus.suspended] },
        ...(excludeSubscriptionId
          ? { id: { not: excludeSubscriptionId } }
          : {}),
      },
      select: { id: true },
    });
    if (linked) {
      throw new ConflictException(
        'PPPoE account is already linked to another active subscription',
      );
    }
  }
}
