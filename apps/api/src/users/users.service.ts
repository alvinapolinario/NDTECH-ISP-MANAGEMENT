import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { assertSuperAdmin } from '../common/staff-role';
import { PrismaService } from '../prisma/prisma.service';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { getPagination } from '../common/pagination';
import { AssignUserRolesDto } from './dto/assign-user-roles.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from '../auth/dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto, actorUserId?: number) {
    const { roleIds, ...userFields } = dto;

    if (roleIds !== undefined) {
      await assertSuperAdmin(this.prisma, actorUserId);
    }

    const passwordHash = await bcrypt.hash(userFields.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: userFields.name,
        email: userFields.email,
        mobileNumber: userFields.mobileNumber,
        passwordHash,
        status: userFields.status,
      },
      select: this.safeSelect(),
    });

    if (roleIds !== undefined) {
      await this.syncRoles(user.id, roleIds);
      return this.findOne(user.id);
    }

    return user;
  }

  async findAll(query: ListUsersQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const where = {
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { email: { contains: query.search } },
              { mobileNumber: { contains: query.search } },
            ],
          }
        : {}),
      ...(query.filter ? { status: query.filter as any } : {}),
      ...(query.role
        ? {
            roles: {
              some: {
                role: {
                  name: query.role,
                },
              },
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: this.safeSelect(),
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, meta: { total, page, limit } };
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: this.safeSelect(),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmailWithPassword(email: string) {
    return this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: { roles: { include: { role: true } } },
    });
  }

  async update(id: number, dto: UpdateUserDto, actorUserId?: number) {
    await this.findOne(id);
    const { roleIds, ...userFields } = dto;

    if (roleIds !== undefined) {
      await assertSuperAdmin(this.prisma, actorUserId);
      await this.syncRoles(id, roleIds);
    }

    const passwordHash = userFields.password
      ? await bcrypt.hash(userFields.password, 10)
      : undefined;

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        name: userFields.name,
        email: userFields.email,
        mobileNumber: userFields.mobileNumber,
        passwordHash,
        status: userFields.status,
      },
      select: this.safeSelect(),
    });

    return updated;
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: this.safeSelect(),
    });
  }

  async updateProfile(id: number, dto: UpdateProfileDto) {
    const current = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!current) {
      throw new NotFoundException('User not found');
    }

    if (dto.password) {
      if (!dto.currentPassword) {
        throw new BadRequestException(
          'Current password is required to set a new password',
        );
      }

      const valid = await bcrypt.compare(
        dto.currentPassword,
        current.passwordHash,
      );

      if (!valid) {
        throw new UnauthorizedException('Current password is incorrect');
      }
    }

    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, 10)
      : undefined;

    try {
      const updated = await this.prisma.user.update({
        where: { id },
        data: {
          name: dto.name,
          email: dto.email,
          mobileNumber:
            dto.mobileNumber === undefined ? undefined : dto.mobileNumber,
          passwordHash,
        },
        select: this.safeSelect(),
      });

      return updated;
    } catch (error) {
      this.rethrowUniqueEmail(error);
    }
  }

  async recordLogin(id: number) {
    await this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  async assignRoles(
    id: number,
    dto: AssignUserRolesDto,
    actorUserId?: number,
  ) {
    await this.findOne(id);
    await assertSuperAdmin(this.prisma, actorUserId);
    await this.syncRoles(id, dto.roleIds);
    return this.findOne(id);
  }

  private async syncRoles(userId: number, roleIds: number[]) {
    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId } }),
      ...(roleIds.length
        ? [
            this.prisma.userRole.createMany({
              data: roleIds.map((roleId) => ({ userId, roleId })),
              skipDuplicates: true,
            }),
          ]
        : []),
    ]);
  }

  private safeSelect() {
    return {
      id: true,
      name: true,
      email: true,
      mobileNumber: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      roles: { include: { role: true } },
    };
  }

  private rethrowUniqueEmail(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Email address is already in use');
    }

    throw error;
  }
}
