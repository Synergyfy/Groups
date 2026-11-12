import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import type { AuthenticatedRequest } from "../auth/jwt-auth.guard.js";

@Injectable()
export class ConsumerRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    if (request.user?.role !== "CUSTOMER") {
      throw new ForbiddenException("Consumer account required");
    }

    return true;
  }
}
