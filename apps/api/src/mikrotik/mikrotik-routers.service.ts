import { Injectable, NotFoundException } from '@nestjs/common';
import { MikrotikCommandStatus, PppoeAccountStatus } from '@prisma/client';
import { getPagination } from '../common/pagination';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { MikroTikClientFactory } from './clients/mikrotik-client.factory';
import { SecretCryptoService } from './crypto/secret-crypto.service';
import { MikrotikRouterAccessService } from './mikrotik-router-access.service';
import { CreateMikrotikRouterDto } from './dto/create-mikrotik-router.dto';
import { UpdateMikrotikRouterDto } from './dto/update-mikrotik-router.dto';
import { MikrotikCommandLoggerService } from './mikrotik-command-logger.service';
import {
  formatMikrotikRouterError,
  toMikrotikRouterException,
} from './mikrotik-router-error.util';

@Injectable()
export class MikrotikRoutersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly secretCrypto: SecretCryptoService,
    private readonly routerAccess: MikrotikRouterAccessService,
    private readonly clientFactory: MikroTikClientFactory,
    private readonly commandLogger: MikrotikCommandLoggerService,
  ) {}

  create(dto: CreateMikrotikRouterDto) {
    return this.prisma.mikrotikRouter.create({
      data: {
        name: dto.name,
        host: dto.host,
        apiPort: dto.apiPort ?? 8728,
        username: dto.username,
        passwordEncrypted: this.secretCrypto.encrypt(dto.password),
        status: dto.status,
        notes: dto.notes,
      },
      select: this.publicRouterSelect(),
    });
  }

  async findAll(query: ListQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const where = {
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { host: { contains: query.search } },
              { username: { contains: query.search } },
            ],
          }
        : {}),
      ...(query.filter ? { status: query.filter as any } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.mikrotikRouter.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: this.publicRouterSelect(),
      }),
      this.prisma.mikrotikRouter.count({ where }),
    ]);

    return { items, meta: { total, page, limit } };
  }

  async findOne(id: number) {
    const router = await this.prisma.mikrotikRouter.findUnique({
      where: { id },
      select: this.publicRouterSelect(),
    });

    if (!router) {
      throw new NotFoundException('MikroTik router not found');
    }

    return router;
  }

  async update(id: number, dto: UpdateMikrotikRouterDto) {
    await this.findOne(id);

    return this.prisma.mikrotikRouter.update({
      where: { id },
      data: {
        name: dto.name,
        host: dto.host,
        apiPort: dto.apiPort,
        username: dto.username,
        passwordEncrypted: dto.password
          ? this.secretCrypto.encrypt(dto.password)
          : undefined,
        status: dto.status,
        notes: dto.notes,
      },
      select: this.publicRouterSelect(),
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.mikrotikRouter.delete({
      where: { id },
      select: this.publicRouterSelect(),
    });
  }

  async testConnection(id: number) {
    const router = await this.routerAccess.getRouterWithSecret(id);
    const client = this.clientFactory.create(router);
    const result = await client.testConnection();

    await this.commandLogger.log({
      routerId: id,
      commandType: 'test_connection',
      commandPayload: { host: router.host, apiPort: router.apiPort },
      responseMessage: result.message,
      status: result.ok
        ? this.commandStatus()
        : MikrotikCommandStatus.failed,
    });

    await this.prisma.mikrotikRouter.update({
      where: { id },
      data: { lastConnectionCheckAt: new Date() },
    });

    return result;
  }

  async listPppoeProfiles(id: number) {
    await this.findOne(id);
    const router = await this.routerAccess.getRouterWithSecret(id);
    const client = this.clientFactory.create(router);

    try {
      const profiles = await client.listPppoeProfiles();
      return { items: profiles };
    } catch (error) {
      throw toMikrotikRouterException(
        error,
        'list PPP profiles',
        router.host,
        router.apiPort,
      );
    }
  }

  async syncPppoeAccounts(id: number) {
    const router = await this.routerAccess.getRouterWithSecret(id);
    const client = this.clientFactory.create(router);

    let secrets;
    try {
      secrets = await client.listPppoeSecrets();
    } catch (error) {
      const message = formatMikrotikRouterError(error);

      await this.commandLogger.log({
        routerId: id,
        commandType: 'sync_pppoe_accounts',
        commandPayload: { source: '/ppp/secret/print' },
        responseMessage: message,
        status: MikrotikCommandStatus.failed,
      });

      throw toMikrotikRouterException(
        error,
        'sync PPPoE accounts',
        router.host,
        router.apiPort,
      );
    }

    await this.commandLogger.log({
      routerId: id,
      commandType: 'sync_pppoe_accounts',
      commandPayload: { count: secrets.length },
      responseMessage: `Fetched ${secrets.length} PPPoE secrets from router`,
      status: this.commandStatus(),
    });

    let updated = 0;
    let imported = 0;

    for (const secret of secrets) {
      const matchedPlan = secret.profileName
        ? await this.prisma.servicePlan.findFirst({
            where: {
              deletedAt: null,
              OR: [
                { code: secret.profileName },
                { name: secret.profileName },
              ],
            },
          })
        : null;
      const account = await this.prisma.pppoeAccount.findUnique({
        where: {
          routerId_username: {
            routerId: id,
            username: secret.username,
          },
        },
      });

      if (!account) {
        await this.prisma.pppoeAccount.create({
          data: {
            routerId: id,
            username: secret.username,
            passwordEncrypted: this.secretCrypto.encrypt(secret.password ?? ''),
            profileName: secret.profileName,
            remoteAddress: secret.remoteAddress,
            servicePlanId: matchedPlan?.id,
            status: secret.disabled
              ? PppoeAccountStatus.disabled
              : PppoeAccountStatus.active,
            lastSyncedAt: new Date(),
          },
        });
        imported += 1;
        continue;
      }

      await this.prisma.pppoeAccount.update({
        where: { id: account.id },
        data: {
          servicePlanId: account.servicePlanId ?? matchedPlan?.id,
          passwordEncrypted: secret.password
            ? this.secretCrypto.encrypt(secret.password)
            : account.passwordEncrypted,
          profileName: secret.profileName,
          remoteAddress: secret.remoteAddress,
          status: secret.disabled
            ? PppoeAccountStatus.disabled
            : account.status === PppoeAccountStatus.suspended
              ? PppoeAccountStatus.suspended
              : PppoeAccountStatus.active,
          lastSyncedAt: new Date(),
        },
      });
      updated += 1;
    }

    return {
      routerId: id,
      fetched: secrets.length,
      updated,
      imported,
      skipped: 0,
      message:
        process.env.MIKROTIK_USE_MOCK !== 'false'
          ? 'PPPoE account sync completed using mock adapter'
          : 'PPPoE account sync completed from RouterOS /ppp/secret',
    };
  }

  private publicRouterSelect() {
    return {
      id: true,
      name: true,
      host: true,
      apiPort: true,
      username: true,
      status: true,
      lastConnectionCheckAt: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          pppoeAccounts: true,
          commandLogs: true,
        },
      },
    };
  }

  private commandStatus() {
    return process.env.MIKROTIK_USE_MOCK !== 'false'
      ? MikrotikCommandStatus.mock_logged
      : MikrotikCommandStatus.executed;
  }
}
