import { Module } from "@nestjs/common";
import { AccessPassPlansController } from "./access-pass-plans.controller.js";
import { SystemApiKeyGuard } from "./system-api-key.guard.js";
import { SystemPlansController } from "./system-plans.controller.js";
import { SystemPlansService } from "./system-plans.service.js";

@Module({
  controllers: [SystemPlansController, AccessPassPlansController],
  providers: [SystemPlansService, SystemApiKeyGuard],
})
export class SystemModule {}
