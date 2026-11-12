import { applyDecorators, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { ConsumerRoleGuard } from "./consumer-role.guard.js";

export const ConsumerOnly = () =>
  applyDecorators(UseGuards(JwtAuthGuard, ConsumerRoleGuard));
