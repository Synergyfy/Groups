import { Module } from "@nestjs/common";
import { AdminRoleGuard } from "../admin/admin-role.guard.js";
import { AuthModule } from "../auth/auth.module.js";
import { GroupsController } from "./groups.controller.js";
import { GroupsService } from "./groups.service.js";

@Module({
  imports: [AuthModule],
  controllers: [GroupsController],
  providers: [GroupsService, AdminRoleGuard],
})
export class GroupsModule {}
