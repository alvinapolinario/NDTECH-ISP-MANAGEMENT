import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const SUPER_ADMIN_ROLE = 'Super Admin';

export const ADMIN_PORTAL_ROLES = new Set([SUPER_ADMIN_ROLE, 'Admin']);

export const STAFF_ROLES = {
  COLLECTOR: 'Collector',
  INSTALLER: 'Installer',
  FINANCE: 'Finance',
  CONTRACTOR: 'Contractor',
} as const;

export const OUTSOURCED_PROJECT_TYPES = new Set([
  'cctv',
  'solar',
  'outsourced',
]);

export function isOutsourcedProjectType(projectType?: string | null) {
  return projectType ? OUTSOURCED_PROJECT_TYPES.has(projectType) : false;
}

export type StaffRoleName = (typeof STAFF_ROLES)[keyof typeof STAFF_ROLES];

export async function assertSuperAdmin(
  prisma: PrismaService,
  userId?: number,
) {
  if (!userId) {
    throw new ForbiddenException(
      'Super Admin access is required to assign user roles',
    );
  }

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      deletedAt: null,
      status: 'active',
      roles: {
        some: {
          role: {
            name: SUPER_ADMIN_ROLE,
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!user) {
    throw new ForbiddenException(
      'Super Admin access is required to assign user roles',
    );
  }

  return user;
}

export async function assertActiveStaffRole(
  prisma: PrismaService,
  userId: number,
  roleName: StaffRoleName,
) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      deletedAt: null,
      status: 'active',
      roles: {
        some: {
          role: {
            name: roleName,
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!user) {
    throw new BadRequestException(
      `User #${userId} is not an active ${roleName}`,
    );
  }

  return user;
}

export async function resolveStaffAssignment(
  prisma: PrismaService,
  userId: number | null | undefined,
  roleName: StaffRoleName,
) {
  if (userId === undefined) {
    return undefined;
  }

  if (userId === null) {
    return { userId: null, name: null };
  }

  const user = await assertActiveStaffRole(prisma, userId, roleName);
  return { userId: user.id, name: user.name };
}
