import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import type { AuthenticatedRequest } from "../auth/jwt-auth.guard.js";

@Injectable()
export class BusinessRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    if (request.user?.role !== "BUSINESS") {
      throw new ForbiddenException("Business account required");
    }

    return true;
  }
}
