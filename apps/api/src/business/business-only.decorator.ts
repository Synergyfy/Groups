import { applyDecorators, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { BusinessAccessGuard } from "./business-access.guard.js";
import { BusinessRoleGuard } from "./business-role.guard.js";

/** Requires a valid session whose user has the BUSINESS role. */
export const BusinessOnly = () =>
  applyDecorators(
    UseGuards(JwtAuthGuard, BusinessRoleGuard, BusinessAccessGuard),
  );
