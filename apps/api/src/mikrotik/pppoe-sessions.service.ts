import { Injectable } from '@nestjs/common';
import { MikrotikCommandStatus, PppoeSessionStatus } from '@prisma/client';
import { getPagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { MikroTikClientFactory } from './clients/mikrotik-client.factory';
import { ListPppoeSessionsQueryDto } from './dto/list-pppoe-sessions-query.dto';
import { MikrotikCommandLoggerService } from './mikrotik-command-logger.service';
import { MikrotikRouterAccessService } from './mikrotik-router-access.service';

@Injectable()
export class PppoeSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientFactory: MikroTikClientFactory,
    private readonly commandLogger: MikrotikCommandLoggerService,
    private readonly routerAccess: MikrotikRouterAccessService,
  ) {}

  async findAll(query: ListPppoeSessionsQueryDto) {
    if (!query.routerId) {
      const { page, limit } = getPagination(query);
      return { items: [], meta: { total: 0, page, limit } };
    }

    await this.refreshRouterSessions(query.routerId);

    const { page, limit, skip } = getPagination(query);

    const where = {
      routerId: query.routerId,
      ...(query.search
        ? {
            OR: [
              { username: { contains: query.search } },
              { ipAddress: { contains: query.search } },
              { macAddress: { contains: query.search } },
              { pppoeAccount: { username: { contains: query.search } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.pppoeSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { checkedAt: 'desc' },
        include: {
          pppoeAccount: {
            select: {
              id: true,
              username: true,
              status: true,
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
            },
          },
          router: {
            select: { id: true, name: true, host: true },
          },
        },
      }),
      this.prisma.pppoeSession.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        rxBytes: item.rxBytes.toString(),
        txBytes: item.txBytes.toString(),
      })),
      meta: { total, page, limit },
    };
  }

  async refreshRouterSessions(routerId: number) {
    const router = await this.routerAccess.getRouterWithSecret(routerId);
    const client = this.clientFactory.create(router);
    const sessions = await client.listActiveSessions();

    await this.commandLogger.log({
      routerId,
      commandType: 'list_active_sessions',
      commandPayload: { source: '/ppp/active/print', count: sessions.length },
      responseMessage: `Fetched ${sessions.length} active PPPoE sessions from router`,
      status: this.commandStatus(),
    });

    const accounts = await this.prisma.pppoeAccount.findMany({
      where: { routerId },
      select: { id: true, username: true },
    });
    const accountByUsername = new Map(
      accounts.map((account) => [account.username, account.id]),
    );

    const checkedAt = new Date();
    const activeSessions = sessions.map((session) => ({
      pppoeAccountId: accountByUsername.get(session.username) ?? null,
      routerId,
      username: session.username,
      ipAddress: session.ipAddress,
      macAddress: session.macAddress,
      uptime: session.uptime,
      rxBytes: BigInt(session.rxBytes),
      txBytes: BigInt(session.txBytes),
      status: PppoeSessionStatus.online,
      checkedAt,
    }));

    await this.prisma.pppoeSession.deleteMany({ where: { routerId } });

    if (activeSessions.length) {
      await this.prisma.pppoeSession.createMany({ data: activeSessions });
    }

    return { routerId, sessions: activeSessions.length };
  }

  private commandStatus() {
    return process.env.MIKROTIK_USE_MOCK !== 'false'
      ? MikrotikCommandStatus.mock_logged
      : MikrotikCommandStatus.executed;
  }
}
