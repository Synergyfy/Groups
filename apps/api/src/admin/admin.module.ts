import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { PaymentsModule } from "../payments/payments.module.js";
import { AdminAuditService } from "./admin-audit.service.js";
import { AdminRoleGuard } from "./admin-role.guard.js";
import { AdminCatalogService } from "./catalog/catalog.service.js";
import {
  AdminPlansController,
  AdminRewardsDealsController,
} from "./catalog/catalog.controller.js";
import { AdminConfigService } from "./config/config.service.js";
import {
  AdminConfigController,
  AdminSettingsController,
} from "./config/config.controller.js";
import { AdminGroupsService } from "./groups/groups.service.js";
import {
  AdminCirclesController,
  AdminGroupsController,
} from "./groups/groups.controller.js";
import { AdminOperationsService } from "./operations/operations.service.js";
import {
  AdminInvitationsController,
  AdminSettingsReportsController,
} from "./operations/operations.controller.js";
import { AdminPaymentsController } from "./payments/admin-payments.controller.js";
import { AdminPaymentsService } from "./payments/admin-payments.service.js";
import { AdminOverviewService } from "./overview/overview.service.js";
import { AdminOverviewController } from "./overview/overview.controller.js";
import { AdminUsersService } from "./users/users.service.js";
import { AdminUsersController } from "./users/users.controller.js";

@Module({
  imports: [AuthModule, PaymentsModule],
  controllers: [
    AdminOverviewController,
    AdminUsersController,
    AdminGroupsController,
    AdminCirclesController,
    AdminConfigController,
    AdminSettingsController,
    AdminPlansController,
    AdminRewardsDealsController,
    AdminInvitationsController,
    AdminSettingsReportsController,
    AdminPaymentsController,
  ],
  providers: [
    AdminRoleGuard,
    AdminAuditService,
    AdminOverviewService,
    AdminUsersService,
    AdminGroupsService,
    AdminConfigService,
    AdminCatalogService,
    AdminOperationsService,
    AdminPaymentsService,
  ],
})
export class AdminModule {}
