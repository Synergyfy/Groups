import { Module } from "@nestjs/common";
import { McomApiKeyGuard } from "./mcom-api-key.guard.js";
import { SystemPlansController } from "./system-plans.controller.js";
import { SystemPlansService } from "./system-plans.service.js";

@Module({
  controllers: [SystemPlansController],
  providers: [SystemPlansService, McomApiKeyGuard],
})
export class SystemModule {}
