import { Module } from "@nestjs/common";
import { McomController } from "./mcom.controller.js";
import { McomServiceAuthGuard } from "./mcom-service-auth.guard.js";
import { McomService } from "./mcom.service.js";

@Module({
  controllers: [McomController],
  providers: [McomService, McomServiceAuthGuard],
  exports: [McomService, McomServiceAuthGuard],
})
export class McomModule {}
