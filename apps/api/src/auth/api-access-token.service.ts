import { createHash, randomBytes } from 'node:crypto';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { getPagination } from '../common/pagination';
import {
  ADMIN_PORTAL_ROLES,
  assertActiveStaffRole,
  STAFF_ROLES,
} from '../common/staff-role';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from './current-user.decorator';
import { ListApiTokensQueryDto } from './dto/list-api-tokens-query.dto';
import * as bcrypt from 'bcrypt';

export const API_TOKEN_PREFIX = 'ndt_';
const TOKEN_TTL_DAYS = 90;

type TokenUserSummary = {
  id: number;
  name: string;
  email: string;
};

@Injectable()
export class ApiAccessTokenService {
  constructor(private readonly prisma: PrismaService) {}

  async issueForCollector(input: {
    email: string;
    password: string;
    label?: string;
    deviceId?: string;
  }) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: input.email.trim(),
        deletedAt: null,
        status: 'active',
      },
      include: {
        roles: { include: { role: true } },
      },
    });

    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isCollector = user.roles.some(
      (userRole) => userRole.role.name === STAFF_ROLES.COLLECTOR,
    );

    if (!isCollector) {
      throw new ForbiddenException('API tokens can only be issued to collectors');
    }

    return this.createToken({
      userId: user.id,
      label: input.label,
      deviceId: input.deviceId,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  }

  async issueForCollectorUser(
    actor: AuthenticatedUser,
    input: {
      userId: number;
      label?: string;
      deviceId?: string;
    },
  ) {
    this.assertPortalAdmin(actor);

    const collector = await assertActiveStaffRole(
      this.prisma,
      input.userId,
      STAFF_ROLES.COLLECTOR,
    );

    return this.createToken({
      userId: collector.id,
      label: input.label,
      deviceId: input.deviceId,
      user: collector,
    });
  }

  async listForAdmin(actor: AuthenticatedUser, query: ListApiTokensQueryDto) {
    this.assertPortalAdmin(actor);
    const { page, limit, skip } = getPagination(query);
    const now = new Date();

    const where = {
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.search
        ? {
            OR: [
              { label: { contains: query.search } },
              { user: { name: { contains: query.search } } },
              { user: { email: { contains: query.search } } },
            ],
          }
        : {}),
      ...(query.filter === 'active'
        ? { revokedAt: null, expiresAt: { gt: now } }
        : {}),
      ...(query.filter === 'revoked' ? { revokedAt: { not: null } } : {}),
      ...(query.filter === 'expired'
        ? { revokedAt: null, expiresAt: { lte: now } }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.apiAccessToken.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.apiAccessToken.count({ where }),
    ]);

    return {
      items: items.map((item) => this.toListItem(item)),
      meta: { total, page, limit },
    };
  }

  async revokeForAdmin(actor: AuthenticatedUser, id: number) {
    this.assertPortalAdmin(actor);

    const record = await this.prisma.apiAccessToken.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!record) {
      throw new NotFoundException('API token not found');
    }

    if (record.revokedAt) {
      return this.toListItem(record);
    }

    const updated = await this.prisma.apiAccessToken.update({
      where: { id },
      data: { revokedAt: new Date() },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
          },
        },
      },
    });

    return this.toListItem(updated);
  }

  async resolveUserIdFromToken(plainToken: string): Promise<number | null> {
    if (!plainToken.startsWith(API_TOKEN_PREFIX)) {
      return null;
    }

    const tokenHash = this.hashToken(plainToken);
    const record = await this.prisma.apiAccessToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        user: {
          deletedAt: null,
          status: 'active',
        },
      },
      select: { id: true, userId: true },
    });

    if (!record) {
      return null;
    }

    await this.prisma.apiAccessToken.update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    });

    return record.userId;
  }

  hashToken(plainToken: string) {
    return createHash('sha256').update(plainToken).digest('hex');
  }

  private assertPortalAdmin(actor: AuthenticatedUser) {
    const isAdmin = actor.roles.some((role) => ADMIN_PORTAL_ROLES.has(role.name));
    if (!isAdmin) {
      throw new ForbiddenException('Admin access is required to manage API tokens');
    }
  }

  private async createToken(input: {
    userId: number;
    label?: string;
    deviceId?: string;
    user: TokenUserSummary;
  }) {
    const plainToken = `${API_TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`;
    const tokenHash = this.hashToken(plainToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TOKEN_TTL_DAYS);

    await this.prisma.apiAccessToken.create({
      data: {
        userId: input.userId,
        tokenHash,
        label: input.label?.trim() || 'Collector mobile app',
        deviceId: input.deviceId?.trim() || null,
        expiresAt,
      },
    });

    return {
      token: plainToken,
      tokenType: 'Bearer' as const,
      expiresAt: expiresAt.toISOString(),
      user: input.user,
    };
  }

  private toListItem(record: {
    id: number;
    userId: number;
    label: string | null;
    deviceId: string | null;
    expiresAt: Date;
    lastUsedAt: Date | null;
    revokedAt: Date | null;
    createdAt: Date;
    user: {
      id: number;
      name: string;
      email: string;
      status?: string;
    };
  }) {
    const now = new Date();
    const status = record.revokedAt
      ? 'revoked'
      : record.expiresAt <= now
        ? 'expired'
        : 'active';

    return {
      id: record.id,
      userId: record.userId,
      label: record.label,
      deviceId: record.deviceId,
      status,
      expiresAt: record.expiresAt.toISOString(),
      lastUsedAt: record.lastUsedAt?.toISOString() ?? null,
      revokedAt: record.revokedAt?.toISOString() ?? null,
      createdAt: record.createdAt.toISOString(),
      user: record.user,
    };
  }
}
