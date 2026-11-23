import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { AdminRoleGuard } from "../admin/admin-role.guard.js";
import { GeographyClient } from "./geography.client.js";
import { AdminGeographyController } from "./geography.controller.js";
import { GeographyService } from "./geography.service.js";

@Module({
  imports: [AuthModule],
  controllers: [AdminGeographyController],
  providers: [GeographyClient, GeographyService, AdminRoleGuard],
  exports: [GeographyService],
})
export class GeographyModule {}
