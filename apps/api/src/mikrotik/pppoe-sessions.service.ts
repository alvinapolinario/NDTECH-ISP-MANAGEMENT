import { Injectable, NotFoundException } from '@nestjs/common';
import { MikrotikCommandStatus, PppoeSessionStatus } from '@prisma/client';
import { getPagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { RadiusSessionMonitorService } from '../radius/radius-session-monitor.service';
import { MikroTikClientFactory } from './clients/mikrotik-client.factory';
import { ListPppoeSessionsQueryDto } from './dto/list-pppoe-sessions-query.dto';
import { MikrotikCommandLoggerService } from './mikrotik-command-logger.service';
import {
  formatMikrotikRouterError,
  toMikrotikRouterException,
} from './mikrotik-router-error.util';
import { MikrotikRouterAccessService } from './mikrotik-router-access.service';

export type SessionSource = 'both' | 'mikrotik' | 'radius';

export type UnifiedActiveSession = {
  username: string;
  customerName: string | null;
  pppoeAccountId: number | null;
  ipAddress: string | null;
  macAddress: string | null;
  routerName: string;
  uptime: string | null;
  mikrotikRxBytes: string | null;
  mikrotikTxBytes: string | null;
  radiusUploadBytes: string | null;
  radiusDownloadBytes: string | null;
  radiusTotalBytes: string | null;
  sources: SessionSource[];
  acctStartTime: string | null;
  acctUpdateTime: string | null;
  checkedAt: string | null;
};

@Injectable()
export class PppoeSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientFactory: MikroTikClientFactory,
    private readonly commandLogger: MikrotikCommandLoggerService,
    private readonly routerAccess: MikrotikRouterAccessService,
    private readonly radiusMonitor: RadiusSessionMonitorService,
  ) {}

  async findAll(query: ListPppoeSessionsQueryDto) {
    if (!query.routerId) {
      const { page, limit } = getPagination(query);
      return { items: [], meta: { total: 0, page, limit } };
    }

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

    let sessions;
    try {
      sessions = await client.listActiveSessions();
    } catch (error) {
      const message = formatMikrotikRouterError(error);

      await this.commandLogger.log({
        routerId,
        commandType: 'list_active_sessions',
        commandPayload: { source: '/ppp/active/print' },
        responseMessage: message,
        status: MikrotikCommandStatus.failed,
      });

      throw toMikrotikRouterException(
        error,
        'fetch PPPoE sessions',
        router.host,
        router.apiPort,
      );
    }

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

  async getOnlineSummary() {
    const [routers, groupedCounts, latestChecks] = await Promise.all([
      this.prisma.mikrotikRouter.findMany({
        where: { status: 'active' },
        select: { id: true, name: true, host: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.pppoeSession.groupBy({
        by: ['routerId'],
        where: { status: PppoeSessionStatus.online },
        _count: { id: true },
      }),
      this.prisma.pppoeSession.groupBy({
        by: ['routerId'],
        where: { status: PppoeSessionStatus.online },
        _max: { checkedAt: true },
      }),
    ]);

    const countByRouter = new Map(
      groupedCounts.map((entry) => [entry.routerId, entry._count.id]),
    );
    const lastRefreshedByRouter = new Map(
      latestChecks.map((entry) => [
        entry.routerId,
        entry._max.checkedAt?.toISOString() ?? null,
      ]),
    );

    const routerSummaries = routers
      .map((router) => ({
        id: router.id,
        name: router.name,
        host: router.host,
        onlineCount: countByRouter.get(router.id) ?? 0,
        lastRefreshedAt: lastRefreshedByRouter.get(router.id) ?? null,
      }))
      .filter((router) => router.onlineCount > 0)
      .sort((left, right) => {
        if (left.onlineCount === right.onlineCount) {
          return left.name.localeCompare(right.name);
        }
        return right.onlineCount - left.onlineCount;
      });

    return {
      totalOnline: routerSummaries.reduce(
        (total, router) => total + router.onlineCount,
        0,
      ),
      routers: routerSummaries,
      generatedAt: new Date().toISOString(),
    };
  }

  async getMonitoring(routerId: number) {
    const router = await this.prisma.mikrotikRouter.findUnique({
      where: { id: routerId },
      select: { id: true, name: true, host: true },
    });

    if (!router) {
      throw new NotFoundException('MikroTik router not found');
    }

    const [mikrotikSessions, radiusSessions, accounts] = await Promise.all([
      this.prisma.pppoeSession.findMany({
        where: { routerId },
        include: {
          pppoeAccount: {
            select: {
              id: true,
              username: true,
              customer: {
                select: {
                  firstName: true,
                  lastName: true,
                  businessName: true,
                },
              },
            },
          },
        },
        orderBy: { checkedAt: 'desc' },
      }),
      this.radiusMonitor.listActiveSessions(router.host),
      this.prisma.pppoeAccount.findMany({
        where: { routerId },
        select: {
          id: true,
          username: true,
          customer: {
            select: {
              firstName: true,
              lastName: true,
              businessName: true,
            },
          },
        },
      }),
    ]);

    const accountByUsername = new Map(
      accounts.map((account) => [account.username.toLowerCase(), account]),
    );

    const mikrotikByKey = new Map(
      mikrotikSessions.map((session) => [
        this.sessionKey(session.username, session.ipAddress),
        session,
      ]),
    );
    const radiusByKey = new Map(
      radiusSessions.map((session) => [
        this.sessionKey(session.username, session.framedIpAddress),
        session,
      ]),
    );
    const mikrotikByUsername = new Map<string, typeof mikrotikSessions>();
    for (const session of mikrotikSessions) {
      const key = session.username.toLowerCase();
      const bucket = mikrotikByUsername.get(key) ?? [];
      bucket.push(session);
      mikrotikByUsername.set(key, bucket);
    }
    const radiusByUsername = new Map<string, typeof radiusSessions>();
    for (const session of radiusSessions) {
      const key = session.username.toLowerCase();
      const bucket = radiusByUsername.get(key) ?? [];
      bucket.push(session);
      radiusByUsername.set(key, bucket);
    }

    const usedMikrotikIds = new Set<number>();
    const usedRadiusIds = new Set<number>();
    const pairs: Array<{
      mikrotik: (typeof mikrotikSessions)[number] | null;
      radius: (typeof radiusSessions)[number] | null;
    }> = [];

    for (const radius of radiusSessions) {
      const exactKey = this.sessionKey(radius.username, radius.framedIpAddress);
      const exactMikrotik = mikrotikByKey.get(exactKey);
      if (exactMikrotik && !usedMikrotikIds.has(exactMikrotik.id)) {
        usedMikrotikIds.add(exactMikrotik.id);
        usedRadiusIds.add(radius.radacctId);
        pairs.push({ mikrotik: exactMikrotik, radius });
        continue;
      }

      const fallbackMikrotik = (mikrotikByUsername.get(radius.username.toLowerCase()) ?? [])
        .find((session) => !usedMikrotikIds.has(session.id));

      if (fallbackMikrotik) {
        usedMikrotikIds.add(fallbackMikrotik.id);
        usedRadiusIds.add(radius.radacctId);
        pairs.push({ mikrotik: fallbackMikrotik, radius });
        continue;
      }

      usedRadiusIds.add(radius.radacctId);
      pairs.push({ mikrotik: null, radius });
    }

    for (const mikrotik of mikrotikSessions) {
      if (!usedMikrotikIds.has(mikrotik.id)) {
        pairs.push({ mikrotik, radius: null });
      }
    }

    let matched = 0;
    let mikrotikOnly = 0;
    let radiusOnly = 0;
    const sessions: UnifiedActiveSession[] = [];

    for (const pair of pairs) {
      const { mikrotik, radius } = pair;
      const sources: SessionSource[] = [];

      if (mikrotik && radius) {
        sources.push('both');
        matched += 1;
      } else if (mikrotik) {
        sources.push('mikrotik');
        mikrotikOnly += 1;
      } else if (radius) {
        sources.push('radius');
        radiusOnly += 1;
      }

      const username = mikrotik?.username ?? radius?.username ?? '';
      const account =
        mikrotik?.pppoeAccount ??
        accountByUsername.get(username.toLowerCase()) ??
        null;

      sessions.push({
        username,
        customerName: account?.customer
          ? this.customerName(account.customer)
          : null,
        pppoeAccountId: account?.id ?? null,
        ipAddress: mikrotik?.ipAddress ?? radius?.framedIpAddress ?? null,
        macAddress: mikrotik?.macAddress ?? radius?.callingStationId ?? null,
        routerName: router.name,
        uptime: mikrotik?.uptime ?? null,
        mikrotikRxBytes: mikrotik ? mikrotik.rxBytes.toString() : null,
        mikrotikTxBytes: mikrotik ? mikrotik.txBytes.toString() : null,
        radiusUploadBytes: radius?.uploadBytes ?? null,
        radiusDownloadBytes: radius?.downloadBytes ?? null,
        radiusTotalBytes: radius?.totalBytes ?? null,
        sources,
        acctStartTime: radius?.acctStartTime ?? null,
        acctUpdateTime: radius?.acctUpdateTime ?? null,
        checkedAt: mikrotik?.checkedAt.toISOString() ?? null,
      });
    }

    sessions.sort((left, right) => {
      const leftTotal = BigInt(left.radiusTotalBytes ?? '0');
      const rightTotal = BigInt(right.radiusTotalBytes ?? '0');
      if (leftTotal === rightTotal) {
        return left.username.localeCompare(right.username);
      }
      return leftTotal > rightTotal ? -1 : 1;
    });

    const trafficRanking = this.buildTrafficRanking(sessions);

    return {
      router,
      radiusConfigured: this.radiusMonitor.isConfigured(),
      summary: {
        mikrotikActive: mikrotikSessions.length,
        radiusActive: radiusSessions.length,
        matched,
        mikrotikOnly,
        radiusOnly,
        totalUnique: sessions.length,
      },
      trafficRanking,
      sessions,
      generatedAt: new Date().toISOString(),
    };
  }

  private buildTrafficRanking(sessions: UnifiedActiveSession[]) {
    const aggregated = new Map<
      string,
      {
        username: string;
        customerName: string | null;
        pppoeAccountId: number | null;
        ipAddress: string | null;
        macAddress: string | null;
        uploadBytes: bigint;
        downloadBytes: bigint;
        totalBytes: bigint;
        sessionCount: number;
        sources: Set<SessionSource>;
      }
    >();

    for (const session of sessions) {
      if (!session.sources.includes('radius') && !session.sources.includes('both')) {
        continue;
      }

      const key = session.username.toLowerCase();
      const current = aggregated.get(key) ?? {
        username: session.username,
        customerName: session.customerName,
        pppoeAccountId: session.pppoeAccountId,
        ipAddress: session.ipAddress,
        macAddress: session.macAddress,
        uploadBytes: 0n,
        downloadBytes: 0n,
        totalBytes: 0n,
        sessionCount: 0,
        sources: new Set<SessionSource>(),
      };

      current.uploadBytes += BigInt(session.radiusUploadBytes ?? '0');
      current.downloadBytes += BigInt(session.radiusDownloadBytes ?? '0');
      current.totalBytes += BigInt(session.radiusTotalBytes ?? '0');
      current.sessionCount += 1;
      current.customerName = current.customerName ?? session.customerName;
      current.pppoeAccountId = current.pppoeAccountId ?? session.pppoeAccountId;
      current.ipAddress = current.ipAddress ?? session.ipAddress;
      current.macAddress = current.macAddress ?? session.macAddress;
      for (const source of session.sources) {
        current.sources.add(source);
      }

      aggregated.set(key, current);
    }

    const ranked = [...aggregated.values()].sort((left, right) => {
      if (left.totalBytes === right.totalBytes) {
        return left.username.localeCompare(right.username);
      }
      return left.totalBytes > right.totalBytes ? -1 : 1;
    });

    return ranked.map((entry, index) => ({
      rank: index + 1,
      username: entry.username,
      customerName: entry.customerName,
      pppoeAccountId: entry.pppoeAccountId,
      ipAddress: entry.ipAddress,
      macAddress: entry.macAddress,
      uploadBytes: entry.uploadBytes.toString(),
      downloadBytes: entry.downloadBytes.toString(),
      totalBytes: entry.totalBytes.toString(),
      sessionCount: entry.sessionCount,
      sources: [...entry.sources],
    }));
  }

  private sessionKey(username: string, ipAddress?: string | null) {
    return `${username.trim().toLowerCase()}::${ipAddress?.trim() ?? ''}`;
  }

  private customerName(customer: {
    firstName: string | null;
    lastName: string | null;
    businessName: string | null;
  }) {
    if (customer.businessName?.trim()) {
      return customer.businessName.trim();
    }

    return `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() || "Unlinked";
  }

  private commandStatus() {
    return process.env.MIKROTIK_USE_MOCK !== 'false'
      ? MikrotikCommandStatus.mock_logged
      : MikrotikCommandStatus.executed;
  }

  async findActiveByAccountId(pppoeAccountId: number) {
    const account = await this.prisma.pppoeAccount.findUnique({
      where: { id: pppoeAccountId },
      include: {
        router: {
          select: { id: true, name: true, host: true },
        },
      },
    });

    if (!account) {
      return null;
    }

    if (process.env.MIKROTIK_USE_MOCK !== 'true') {
      try {
        const router = await this.routerAccess.getRouterWithSecret(account.routerId);
        const client = this.clientFactory.create(router);
        const sessions = await client.listActiveSessions();
        const match = sessions.find((session) => session.username === account.username);

        if (match) {
          return {
            username: account.username,
            ipAddress: match.ipAddress ?? null,
            macAddress: match.macAddress ?? null,
            uptime: match.uptime ?? null,
            checkedAt: new Date().toISOString(),
            online: true,
            source: 'mikrotik' as const,
            routerName: account.router.name,
          };
        }
      } catch {
        // Fall back to RADIUS / cached session data below.
      }
    }

    const radiusSessions = await this.radiusMonitor.listActiveSessions(
      account.router.host,
    );
    const radiusMatch = radiusSessions.find(
      (session) => session.username === account.username,
    );

    if (radiusMatch) {
      return {
        username: account.username,
        ipAddress: radiusMatch.framedIpAddress ?? null,
        macAddress: radiusMatch.callingStationId ?? null,
        uptime: null,
        checkedAt:
          radiusMatch.acctUpdateTime ??
          radiusMatch.acctStartTime ??
          new Date().toISOString(),
        online: true,
        source: 'radius' as const,
        routerName: account.router.name,
      };
    }

    const cached = await this.prisma.pppoeSession.findFirst({
      where: {
        pppoeAccountId,
        status: PppoeSessionStatus.online,
      },
      orderBy: { checkedAt: 'desc' },
    });

    if (cached) {
      return {
        username: account.username,
        ipAddress: cached.ipAddress ?? null,
        macAddress: cached.macAddress ?? null,
        uptime: cached.uptime ?? null,
        checkedAt: cached.checkedAt.toISOString(),
        online: true,
        source: 'cached' as const,
        routerName: account.router.name,
      };
    }

    if (account.remoteAddress) {
      return {
        username: account.username,
        ipAddress: account.remoteAddress,
        macAddress: null,
        uptime: null,
        checkedAt: null,
        online: false,
        source: 'static' as const,
        routerName: account.router.name,
      };
    }

    return {
      username: account.username,
      ipAddress: null,
      macAddress: null,
      uptime: null,
      checkedAt: null,
      online: false,
      source: 'none' as const,
      routerName: account.router.name,
    };
  }
}
