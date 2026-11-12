import {
  createParamDecorator,
  ExecutionContext,
} from "@nestjs/common";
import type { SessionUser } from "./auth.types.js";
import type { AuthenticatedRequest } from "./jwt-auth.guard.js";

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SessionUser => {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();
    return request.user as SessionUser;
  },
);
