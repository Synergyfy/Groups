import { applyDecorators, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { AdminRoleGuard } from "./admin-role.guard.js";

/** Requires a valid session whose user has the ADMIN role. */
export const AdminOnly = () =>
  applyDecorators(UseGuards(JwtAuthGuard, AdminRoleGuard));
