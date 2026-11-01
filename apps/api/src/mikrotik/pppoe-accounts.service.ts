import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MikrotikCommandStatus,
  PppoeAccountActionType,
  PppoeAccountStatus,
  Prisma,
  ServicePlan,
  SubscriptionStatus,
} from '@prisma/client';
import { getPagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { RadiusCoaService } from '../radius/radius-coa.service';
import { RadiusProvisionerService } from '../radius/radius-provisioner.service';
import { shouldUseMikrotikProfileProvisioning } from '../radius/radius-provision.config';
import { MikroTikClientFactory } from './clients/mikrotik-client.factory';
import { SecretCryptoService } from './crypto/secret-crypto.service';
import { CreatePppoeAccountDto } from './dto/create-pppoe-account.dto';
import { ListPppoeAccountsQueryDto } from './dto/list-pppoe-accounts-query.dto';
import { UpdatePppoeAccountDto } from './dto/update-pppoe-account.dto';
import { MikrotikCommandLoggerService } from './mikrotik-command-logger.service';
import {
  getSuspendedPppProfileName,
  resolvePlanPppProfileName,
} from './mikrotik-profile.config';
import { PppoeAccountActionLoggerService } from './pppoe-account-action-logger.service';

type NetworkCommandRecord = {
  commandType: string;
  message: string;
  payload?: Record<string, unknown>;
};

type AccountWithRouter = Prisma.PppoeAccountGetPayload<{
  include: { router: true; servicePlan: true };
}>;

@Injectable()
export class PppoeAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly secretCrypto: SecretCryptoService,
    private readonly clientFactory: MikroTikClientFactory,
    private readonly commandLogger: MikrotikCommandLoggerService,
    private readonly actionLogger: PppoeAccountActionLoggerService,
    private readonly radiusProvisioner: RadiusProvisionerService,
    private readonly radiusCoa: RadiusCoaService,
  ) {}

  async create(dto: CreatePppoeAccountDto) {
    await this.ensureRelations(dto.customerId, dto.servicePlanId, dto.routerId);

    try {
      return await this.prisma.pppoeAccount.create({
        data: {
          customerId: dto.customerId,
          servicePlanId: dto.servicePlanId,
          routerId: dto.routerId,
          username: dto.username,
          passwordEncrypted: this.secretCrypto.encrypt(dto.password),
          profileName: dto.profileName,
          remoteAddress: dto.remoteAddress,
          status: dto.status,
        },
        include: this.includeRelations(),
      });
    } catch (error) {
      this.rethrowUniqueUsername(error);
    }
  }

  async findAll(query: ListPppoeAccountsQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const status = query.status ?? (query.filter as PppoeAccountStatus | undefined);
    const search = query.search?.trim();

    const where = {
      ...(status ? { status } : {}),
      ...(query.routerId ? { routerId: query.routerId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(search
        ? {
            OR: [
              { username: { contains: search } },
              { profileName: { contains: search } },
              { remoteAddress: { contains: search } },
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

    const [items, total] = await Promise.all([
      this.prisma.pppoeAccount.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.includeRelations(),
      }),
      this.prisma.pppoeAccount.count({ where }),
    ]);

    return { items: items.map((item) => this.sanitizeAccount(item)), meta: { total, page, limit } };
  }

  async findOne(id: number) {
    const account = await this.prisma.pppoeAccount.findUnique({
      where: { id },
      include: this.includeRelations(),
    });

    if (!account) {
      throw new NotFoundException('PPPoE account not found');
    }

    return this.sanitizeAccount(account);
  }

  async findActionLogs(id: number, limit = 20) {
    await this.findOne(id);
    const items = await this.actionLogger.findByAccount(id, limit);
    return { items };
  }

  async listRadiusSessions(id: number) {
    const account = await this.loadAccountWithRouter(id);
    const sessions = await this.radiusProvisioner
      .isEnabled()
      ? await this.radiusCoa.listActiveSessions(account.username)
      : [];

    return {
      username: account.username,
      items: sessions,
      source: 'radacct' as const,
    };
  }

  async disconnectRadiusSessions(id: number) {
    const account = await this.loadAccountWithRouter(id);

    if (!this.radiusProvisioner.isEnabled()) {
      throw new BadRequestException('RADIUS provisioning is not enabled');
    }

    const record = await this.radiusProvisioner.disconnectSessions(
      account.username,
    );
    await this.logNetworkCommand(account.routerId, record);

    await this.actionLogger.log({
      pppoeAccountId: account.id,
      customerId: account.customerId,
      routerId: account.routerId,
      action: PppoeAccountActionType.profile_change,
      triggerSource: 'manual_disconnect',
      previousStatus: account.status,
      newStatus: account.status,
      previousProfile: account.profileName,
      newProfile: account.profileName,
      notes: record.message,
    });

    return {
      accountId: account.id,
      username: account.username,
      ...record.payload,
    };
  }

  async update(id: number, dto: UpdatePppoeAccountDto) {
    const current = await this.prisma.pppoeAccount.findUnique({
      where: { id },
      include: { router: true },
    });
    if (!current) {
      throw new NotFoundException('PPPoE account not found');
    }

    if (dto.customerId || dto.servicePlanId || dto.routerId) {
      await this.ensureRelations(
        dto.customerId ?? current.customerId,
        dto.servicePlanId ?? current.servicePlanId,
        dto.routerId ?? current.routerId,
      );
    }

    const routerChanged =
      dto.routerId !== undefined && dto.routerId !== current.routerId;
    const routerUpdate = routerChanged
      ? null
      : this.buildRouterSecretUpdate(current, dto);
    if (routerUpdate) {
      await this.applyRouterSecretUpdate(current, routerUpdate);
    }

    try {
      const updated = await this.prisma.pppoeAccount.update({
        where: { id },
        data: {
          customerId: dto.customerId,
          servicePlanId: dto.servicePlanId,
          routerId: dto.routerId,
          username: dto.username,
          passwordEncrypted: dto.password
            ? this.secretCrypto.encrypt(dto.password)
            : undefined,
          profileName: dto.profileName,
          remoteAddress: dto.remoteAddress,
          status: dto.status,
          ...(routerUpdate ? { lastSyncedAt: new Date() } : {}),
        },
        include: this.includeRelations(),
      });

      return this.sanitizeAccount(updated);
    } catch (error) {
      this.rethrowUniqueUsername(error);
    }
  }

  async linkSubscription(id: number, subscriptionId: number) {
    const [account, subscription] = await Promise.all([
      this.prisma.pppoeAccount.findUnique({ where: { id } }),
      this.prisma.subscription.findUnique({ where: { id: subscriptionId } }),
    ]);

    if (!account) {
      throw new NotFoundException('PPPoE account not found');
    }

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (
      subscription.pppoeAccountId &&
      subscription.pppoeAccountId !== account.id
    ) {
      throw new BadRequestException(
        'Subscription already has a different PPPoE account',
      );
    }

    const linkedSubscription = await this.prisma.subscription.findFirst({
      where: {
        pppoeAccountId: account.id,
        id: { not: subscription.id },
      },
    });

    if (linkedSubscription) {
      throw new ConflictException(
        'PPPoE account is already linked to another subscription',
      );
    }

    await this.prisma.$transaction([
      this.prisma.pppoeAccount.update({
        where: { id },
        data: {
          customerId: subscription.customerId,
          servicePlanId: subscription.servicePlanId,
        },
      }),
      this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { pppoeAccountId: account.id },
      }),
    ]);

    const updated = await this.prisma.pppoeAccount.findUniqueOrThrow({
      where: { id },
      include: this.includeRelations(),
    });

    return this.sanitizeAccount(updated);
  }

  async syncFromSubscription(
    subscriptionId: number,
    triggerSource = 'subscription',
  ) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        servicePlan: true,
        pppoeAccount: {
          include: { router: true, servicePlan: true },
        },
      },
    });

    if (!subscription?.pppoeAccount) {
      return null;
    }

    const account = subscription.pppoeAccount;
    const plan = subscription.servicePlan ?? account.servicePlan;

    if (subscription.status === SubscriptionStatus.suspended) {
      if (account.status === PppoeAccountStatus.suspended) {
        if (this.radiusProvisioner.isEnabled()) {
          const record = await this.radiusProvisioner.suspendUser(account.username);
          await this.logNetworkCommand(account.routerId, record);
        }
        return this.findOne(account.id);
      }

      return this.suspend(account.id);
    }

    if (subscription.status === SubscriptionStatus.active) {
      if (account.status === PppoeAccountStatus.suspended) {
        return this.restoreAccount(account.id, {
          action: PppoeAccountActionType.restore,
          triggerSource,
          account,
          servicePlan: plan,
        });
      }

      const planProfile = plan ? resolvePlanPppProfileName(plan) : null;
      if (!planProfile) {
        return this.findOne(account.id);
      }

      const previousProfile = account.profileName;
      const record = await this.applyProfileOnRouter(
        account,
        planProfile,
        true,
      );

      const updated = await this.prisma.pppoeAccount.update({
        where: { id: account.id },
        data: {
          servicePlanId: subscription.servicePlanId,
          profileName: planProfile,
          lastSyncedAt: new Date(),
        },
        include: this.includeRelations(),
      });

      if (previousProfile !== planProfile) {
        await this.actionLogger.log({
          pppoeAccountId: account.id,
          customerId: account.customerId,
          routerId: account.routerId,
          action: PppoeAccountActionType.profile_change,
          triggerSource,
          previousStatus: account.status,
          newStatus: account.status,
          previousProfile,
          newProfile: planProfile,
          notes: record.message,
        });
      }

      return this.sanitizeAccount(updated);
    }

    if (
      subscription.status === SubscriptionStatus.cancelled ||
      subscription.status === SubscriptionStatus.terminated
    ) {
      if (this.radiusProvisioner.isEnabled()) {
        const record = await this.radiusProvisioner.suspendUser(account.username);
        await this.logNetworkCommand(account.routerId, record);
      } else if (shouldUseMikrotikProfileProvisioning()) {
        return this.suspend(account.id);
      }
    }

    return this.findOne(account.id);
  }

  async remove(id: number) {
    await this.findOne(id);
    const deleted = await this.prisma.pppoeAccount.delete({
      where: { id },
      include: this.includeRelations(),
    });
    return this.sanitizeAccount(deleted);
  }

  async enable(id: number) {
    const account = await this.loadAccountWithRouter(id);

    if (account.status === PppoeAccountStatus.suspended) {
      return this.restoreAccount(id, {
        action: PppoeAccountActionType.enable,
        triggerSource: 'manual',
      });
    }

    const client = this.clientFactory.create(account.router);
    const record = await this.applyNetworkEnable(account, client);
    await this.logNetworkCommand(account.routerId, record);

    const updated = await this.prisma.pppoeAccount.update({
      where: { id },
      data: {
        status: PppoeAccountStatus.active,
        lastSyncedAt: new Date(),
      },
      include: this.includeRelations(),
    });

    await this.actionLogger.log({
      pppoeAccountId: account.id,
      customerId: account.customerId,
      routerId: account.routerId,
      action: PppoeAccountActionType.enable,
      triggerSource: 'manual',
      previousStatus: account.status,
      newStatus: PppoeAccountStatus.active,
      previousProfile: account.profileName,
      newProfile: account.profileName,
      mikrotikMessage: record.message,
    });

    return this.sanitizeAccount(updated);
  }

  async disable(id: number) {
    const account = await this.loadAccountWithRouter(id);
    const record = await this.applyNetworkDisable(account);
    await this.logNetworkCommand(account.routerId, record);

    const updated = await this.prisma.pppoeAccount.update({
      where: { id },
      data: {
        status: PppoeAccountStatus.disabled,
        lastSyncedAt: new Date(),
      },
      include: this.includeRelations(),
    });

    await this.actionLogger.log({
      pppoeAccountId: account.id,
      customerId: account.customerId,
      routerId: account.routerId,
      action: PppoeAccountActionType.disable,
      triggerSource: 'manual',
      previousStatus: account.status,
      newStatus: PppoeAccountStatus.disabled,
      previousProfile: account.profileName,
      newProfile: account.profileName,
      mikrotikMessage: record.message,
    });

    return this.sanitizeAccount(updated);
  }

  async suspend(id: number) {
    const account = await this.loadAccountWithRouter(id);
    const suspendedProfile = getSuspendedPppProfileName();
    const previousProfile = account.profileName;
    const activeProfileName = this.resolveActiveProfileName(account, previousProfile);

    const record = await this.applyProfileOnRouter(
      account,
      suspendedProfile,
      true,
    );

    const updated = await this.prisma.pppoeAccount.update({
      where: { id },
      data: {
        status: PppoeAccountStatus.suspended,
        profileName: suspendedProfile,
        activeProfileName,
        lastSyncedAt: new Date(),
      },
      include: this.includeRelations(),
    });

    await this.actionLogger.log({
      pppoeAccountId: account.id,
      customerId: account.customerId,
      routerId: account.routerId,
      action: PppoeAccountActionType.suspend,
      triggerSource: 'manual',
      previousStatus: account.status,
      newStatus: PppoeAccountStatus.suspended,
      previousProfile,
      newProfile: suspendedProfile,
      mikrotikMessage: record.message,
      notes: `Stored active profile: ${activeProfileName}`,
    });

    return this.sanitizeAccount(updated);
  }

  async restoreAfterPayment(invoiceId: number, paymentId?: number) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, deletedAt: null },
      select: {
        id: true,
        status: true,
        balance: true,
        subscriptionId: true,
        customerId: true,
      },
    });

    if (!invoice || invoice.status !== 'paid' || Number(invoice.balance) > 0) {
      return null;
    }

    const subscription = invoice.subscriptionId
      ? await this.prisma.subscription.findUnique({
          where: { id: invoice.subscriptionId },
          include: {
            servicePlan: true,
            pppoeAccount: { include: { router: true, servicePlan: true } },
          },
        })
      : await this.prisma.subscription.findFirst({
          where: {
            customerId: invoice.customerId,
            status: 'active',
            pppoeAccountId: { not: null },
          },
          include: {
            servicePlan: true,
            pppoeAccount: { include: { router: true, servicePlan: true } },
          },
        });

    if (
      !subscription?.pppoeAccount ||
      !subscription.autoSuspendEnabled ||
      subscription.pppoeAccount.status !== PppoeAccountStatus.suspended
    ) {
      return null;
    }

    return this.restoreAccount(subscription.pppoeAccount.id, {
      action: PppoeAccountActionType.restore,
      triggerSource: 'payment',
      invoiceId: invoice.id,
      paymentId,
      account: subscription.pppoeAccount,
      servicePlan: subscription.servicePlan,
    });
  }

  private async restoreAccount(
    id: number,
    options: {
      action: PppoeAccountActionType;
      triggerSource: string;
      invoiceId?: number;
      paymentId?: number;
      account?: AccountWithRouter;
      servicePlan?: ServicePlan | null;
    },
  ) {
    const account = options.account ?? (await this.loadAccountWithRouter(id));
    const plan =
      options.servicePlan ??
      account.servicePlan ??
      (account.servicePlanId
        ? await this.prisma.servicePlan.findUnique({
            where: { id: account.servicePlanId },
          })
        : null);

    const restoreProfile = this.resolveRestoreProfile(account, plan);
    const previousProfile = account.profileName;
    const previousStatus = account.status;

    const record = await this.applyProfileOnRouter(
      account,
      restoreProfile,
      true,
    );

    const updated = await this.prisma.pppoeAccount.update({
      where: { id: account.id },
      data: {
        status: PppoeAccountStatus.active,
        profileName: restoreProfile,
        activeProfileName: null,
        lastSyncedAt: new Date(),
      },
      include: this.includeRelations(),
    });

    await this.actionLogger.log({
      pppoeAccountId: account.id,
      customerId: account.customerId,
      routerId: account.routerId,
      action: options.action,
      triggerSource: options.triggerSource,
      previousStatus,
      newStatus: PppoeAccountStatus.active,
      previousProfile,
      newProfile: restoreProfile,
      invoiceId: options.invoiceId,
      paymentId: options.paymentId,
      mikrotikMessage: record.message,
    });

    return this.sanitizeAccount(updated);
  }

  private resolveActiveProfileName(
    account: { activeProfileName: string | null; servicePlan: ServicePlan | null },
    currentProfile: string,
  ) {
    const suspendedProfile = getSuspendedPppProfileName();
    if (currentProfile !== suspendedProfile) {
      return currentProfile;
    }

    if (account.activeProfileName) {
      return account.activeProfileName;
    }

    if (account.servicePlan) {
      return resolvePlanPppProfileName(account.servicePlan);
    }

    return currentProfile;
  }

  private resolveRestoreProfile(
    account: {
      activeProfileName: string | null;
      profileName: string;
    },
    plan: ServicePlan | null,
  ) {
    const suspendedProfile = getSuspendedPppProfileName();

    if (account.activeProfileName && account.activeProfileName !== suspendedProfile) {
      return account.activeProfileName;
    }

    if (plan) {
      return resolvePlanPppProfileName(plan);
    }

    if (account.profileName !== suspendedProfile) {
      return account.profileName;
    }

    throw new BadRequestException(
      'Unable to determine restore profile. Link a service plan or set PPPoE profile on the plan.',
    );
  }

  private async applyProfileOnRouter(
    account: AccountWithRouter,
    profileName: string,
    ensureEnabled: boolean,
  ): Promise<NetworkCommandRecord> {
    if (this.radiusProvisioner.isEnabled()) {
      const record = await this.radiusProvisioner.assignUserGroup(
        account.username,
        profileName,
      );
      await this.logNetworkCommand(account.routerId, record);
      return record;
    }

    const client = this.clientFactory.create(account.router);

    try {
      const updateRecord = await client.updatePppoeSecret({
        username: account.username,
        profileName,
      });
      await this.logMikrotikCommand(account.routerId, updateRecord);

      if (ensureEnabled) {
        const enableRecord = await client.enablePppoeSecret(account.username);
        await this.logMikrotikCommand(account.routerId, enableRecord);
        return enableRecord;
      }

      return updateRecord;
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : 'Unable to update PPPoE secret on MikroTik router',
      );
    }
  }

  private async applyNetworkEnable(
    account: AccountWithRouter,
    client: ReturnType<MikroTikClientFactory['create']>,
  ) {
    if (this.radiusProvisioner.isEnabled()) {
      const plan =
        account.servicePlan ??
        (account.servicePlanId
          ? await this.prisma.servicePlan.findUnique({
              where: { id: account.servicePlanId },
            })
          : null);
      const profile = this.resolveRestoreProfile(account, plan);
      return this.radiusProvisioner.assignUserGroup(account.username, profile);
    }

    return client.enablePppoeSecret(account.username);
  }

  private async applyNetworkDisable(account: AccountWithRouter) {
    if (this.radiusProvisioner.isEnabled()) {
      return this.radiusProvisioner.disableUser(account.username);
    }

    const client = this.clientFactory.create(account.router);
    return client.disablePppoeSecret(account.username);
  }

  private async loadAccountWithRouter(id: number) {
    const account = await this.prisma.pppoeAccount.findUnique({
      where: { id },
      include: { router: true, servicePlan: true },
    });

    if (!account) {
      throw new NotFoundException('PPPoE account not found');
    }

    return account;
  }

  private buildRouterSecretUpdate(
    current: {
      username: string;
      profileName: string;
      remoteAddress: string | null;
    },
    dto: UpdatePppoeAccountDto,
  ) {
    const update: {
      username: string;
      profileName?: string;
      password?: string;
      remoteAddress?: string | null;
      newUsername?: string;
    } = { username: current.username };

    let hasChanges = false;

    if (dto.username !== undefined && dto.username !== current.username) {
      update.newUsername = dto.username;
      hasChanges = true;
    }
    if (dto.profileName !== undefined && dto.profileName !== current.profileName) {
      update.profileName = dto.profileName;
      hasChanges = true;
    }
    if (dto.password) {
      update.password = dto.password;
      hasChanges = true;
    }
    if (
      dto.remoteAddress !== undefined &&
      dto.remoteAddress !== current.remoteAddress
    ) {
      update.remoteAddress = dto.remoteAddress;
      hasChanges = true;
    }

    return hasChanges ? update : null;
  }

  private async applyRouterSecretUpdate(
    account: {
      routerId: number;
      router: {
        host: string;
        apiPort: number;
        username: string;
        passwordEncrypted: string;
      };
    },
    update: {
      username: string;
      profileName?: string;
      password?: string;
      remoteAddress?: string | null;
      newUsername?: string;
    },
  ) {
    if (
      this.radiusProvisioner.isEnabled() &&
      update.profileName &&
      !update.password &&
      !update.remoteAddress &&
      !update.newUsername
    ) {
      const record = await this.radiusProvisioner.assignUserGroup(
        update.username,
        update.profileName,
      );
      await this.logNetworkCommand(account.routerId, record);
      return;
    }

    if (this.radiusProvisioner.isEnabled()) {
      if (update.profileName) {
        const record = await this.radiusProvisioner.assignUserGroup(
          update.newUsername ?? update.username,
          update.profileName,
        );
        await this.logNetworkCommand(account.routerId, record);
      }

      if (update.password) {
        const record = await this.radiusProvisioner.updatePassword(
          update.newUsername ?? update.username,
          update.password,
        );
        await this.logNetworkCommand(account.routerId, record);
      }

      if (update.remoteAddress !== undefined || update.newUsername) {
        // Static IP and username changes remain MikroTik-local for now.
      }

      if (
        update.remoteAddress !== undefined ||
        update.newUsername ||
        (!update.profileName && !update.password)
      ) {
        const client = this.clientFactory.create(account.router);
        const record = await client.updatePppoeSecret(update);
        await this.logMikrotikCommand(account.routerId, record);
      }

      return;
    }

    const client = this.clientFactory.create(account.router);
    const record = await client.updatePppoeSecret(update);
    await this.logMikrotikCommand(account.routerId, record);
  }

  private async logNetworkCommand(
    routerId: number,
    record: NetworkCommandRecord,
  ) {
    if (record.commandType.startsWith('radius_')) {
      await this.commandLogger.log({
        routerId,
        commandType: record.commandType,
        commandPayload: record.payload,
        responseMessage: record.message,
        status: this.commandStatus(),
      });
      return;
    }

    await this.logMikrotikCommand(routerId, record);
  }

  private async logMikrotikCommand(
    routerId: number,
    record: {
      commandType: string;
      payload?: Record<string, unknown>;
      message: string;
    },
  ) {
    await this.commandLogger.log({
      routerId,
      commandType: record.commandType,
      commandPayload: record.payload,
      responseMessage: record.message,
      status: this.commandStatus(),
    });
  }

  private commandStatus() {
    return process.env.MIKROTIK_USE_MOCK !== 'false'
      ? MikrotikCommandStatus.mock_logged
      : MikrotikCommandStatus.executed;
  }

  private async ensureRelations(
    customerId: number | null | undefined,
    servicePlanId: number | null | undefined,
    routerId: number,
  ) {
    const [customer, plan, router] = await Promise.all([
      customerId
        ? this.prisma.customer.findFirst({
            where: { id: customerId, deletedAt: null },
          })
        : null,
      servicePlanId
        ? this.prisma.servicePlan.findFirst({
            where: { id: servicePlanId, deletedAt: null },
          })
        : null,
      this.prisma.mikrotikRouter.findUnique({ where: { id: routerId } }),
    ]);

    if (customerId && !customer) throw new NotFoundException('Customer not found');
    if (servicePlanId && !plan) throw new NotFoundException('Service plan not found');
    if (!router) throw new NotFoundException('MikroTik router not found');
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
      servicePlan: {
        select: {
          id: true,
          code: true,
          name: true,
          pppoeProfileName: true,
          monthlyPrice: true,
        },
      },
      router: {
        select: {
          id: true,
          name: true,
          host: true,
          status: true,
          lastConnectionCheckAt: true,
        },
      },
    };
  }

  private sanitizeAccount<T extends { passwordEncrypted: string }>(account: T) {
    const { passwordEncrypted, ...rest } = account;
    return { ...rest, hasPassword: Boolean(passwordEncrypted) };
  }

  private rethrowUniqueUsername(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'PPPoE username already exists on this router',
      );
    }

    throw error;
  }
}
