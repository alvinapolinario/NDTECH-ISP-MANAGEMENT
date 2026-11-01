import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { ADMIN_PORTAL_ROLES, SUPER_ADMIN_ROLE } from './staff-role';

export const ROLES_KEY = 'required_roles';

/** Require any of the listed role names. Admin / Super Admin always pass. */
export const RequireRoles = (...roles: string[]) =>
  SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
    }>();
    const user = request.user;
    const roleNames = user?.roles?.map((role) => role.name) ?? [];

    const allowed =
      roleNames.some((name) => ADMIN_PORTAL_ROLES.has(name)) ||
      roleNames.some((name) => name === SUPER_ADMIN_ROLE) ||
      roleNames.some((name) => required.includes(name));

    if (!allowed) {
      throw new ForbiddenException(
        `Requires one of: ${required.join(', ')} (or Admin)`,
      );
    }

    return true;
  }
}
