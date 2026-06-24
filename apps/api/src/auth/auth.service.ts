import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ADMIN_PORTAL_ROLES, STAFF_ROLES } from '../common/staff-role';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { ApiAccessTokenService } from './api-access-token.service';
import { AuthenticatedUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly apiAccessTokens: ApiAccessTokenService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(dto.email);

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'active') {
      throw new ForbiddenException('This account is not active');
    }

    const roleNames = user.roles.map((userRole) => userRole.role.name);
    const canAccessPortal = roleNames.some((name) => ADMIN_PORTAL_ROLES.has(name));
    const canAccessCollectorApp = roleNames.includes(STAFF_ROLES.COLLECTOR);

    if (!canAccessPortal && !canAccessCollectorApp) {
      throw new ForbiddenException(
        'This account does not have collector or admin access.',
      );
    }

    await this.usersService.recordLogin(user.id);

    const payload = { sub: user.id, email: user.email };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: this.toAuthUser(user),
    };
  }

  async resolveUserFromBearer(token: string): Promise<AuthenticatedUser> {
    const userId = await this.resolveUserIdFromBearer(token);
    if (!userId) {
      throw new UnauthorizedException('Invalid or expired bearer token');
    }

    return this.loadAuthenticatedUser(userId);
  }

  async resolveUserIdFromBearer(token: string): Promise<number | null> {
    const apiUserId = await this.apiAccessTokens.resolveUserIdFromToken(token);
    if (apiUserId) {
      return apiUserId;
    }

    try {
      const payload = await this.jwtService.verifyAsync<{ sub: number }>(token);
      return payload.sub;
    } catch {
      return null;
    }
  }

  async loadAuthenticatedUser(userId: number): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
        status: 'active',
      },
      include: {
        roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User session is no longer valid');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      roles: user.roles.map((userRole) => userRole.role),
    };
  }

  async getProfile(userId: number) {
    const user = await this.usersService.findOne(userId);
    return this.toProfile(user);
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const user = await this.usersService.updateProfile(userId, dto);
    return this.toProfile(user);
  }

  private toProfile(user: {
    id: number;
    name: string;
    email: string;
    mobileNumber: string | null;
    status: string;
    roles: Array<{ role: { id: number; name: string } }>;
  }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      mobileNumber: user.mobileNumber,
      status: user.status,
      roles: user.roles.map((userRole) => userRole.role),
    };
  }

  private toAuthUser(user: {
    id: number;
    name: string;
    email: string;
    status: string;
    roles: Array<{ role: { id: number; name: string } }>;
  }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      roles: user.roles.map((userRole) => userRole.role),
    };
  }
}
