import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import type { AuthenticatedRequest } from "../auth/jwt-auth.guard.js";
import type { SessionRole } from "../auth/auth.types.js";

/**
 * Roles that use the free consumer dashboard. The web app already routes all
 * of these roles to /consumer, so the API must accept the same set.
 */
const CONSUMER_ROLES: ReadonlySet<SessionRole> = new Set<SessionRole>([
  "CUSTOMER",
  "AGENT",
  "CONSULTANT",
  "ACCOUNT_MANAGER",
  "PARTNER",
]);

@Injectable()
export class ConsumerRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    if (!request.user || !CONSUMER_ROLES.has(request.user.role)) {
      throw new ForbiddenException("Consumer account required");
    }

    return true;
  }
}
