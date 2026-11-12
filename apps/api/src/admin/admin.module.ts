import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { AdminAuditService } from "./admin-audit.service.js";
import { AdminRoleGuard } from "./admin-role.guard.js";
import { AdminCatalogService } from "./catalog/catalog.service.js";
import {
  AdminMembershipsController,
  AdminRewardsDealsController,
} from "./catalog/catalog.controller.js";
import { AdminConfigService } from "./config/config.service.js";
import {
  AdminAccessRulesController,
  AdminConfigController,
  AdminPermissionsController,
  AdminSettingsController,
} from "./config/config.controller.js";
import { AdminDirectoryService } from "./directory/directory.service.js";
import {
  AdminBusinessesController,
  AdminCampaignsController,
  AdminPartnerGroupsController,
  AdminPartnersController,
  AdminProgrammesController,
  AdminRelationshipsController,
} from "./directory/directory.controller.js";
import { AdminGroupsService } from "./groups/groups.service.js";
import { AdminGroupsController } from "./groups/groups.controller.js";
import { AdminOperationsService } from "./operations/operations.service.js";
import {
  AdminAuditLogController,
  AdminContentController,
  AdminInvitationsController,
  AdminLocationsController,
  AdminPendingReviewController,
  AdminReportsController,
  AdminSettingsReportsController,
} from "./operations/operations.controller.js";
import { AdminOverviewService } from "./overview/overview.service.js";
import { AdminOverviewController } from "./overview/overview.controller.js";
import { AdminUsersService } from "./users/users.service.js";
import { AdminUsersController } from "./users/users.controller.js";

@Module({
  imports: [AuthModule],
  controllers: [
    AdminOverviewController,
    AdminUsersController,
    AdminGroupsController,
    AdminBusinessesController,
    AdminPartnersController,
    AdminProgrammesController,
    AdminCampaignsController,
    AdminRelationshipsController,
    AdminPartnerGroupsController,
    AdminConfigController,
    AdminPermissionsController,
    AdminAccessRulesController,
    AdminSettingsController,
    AdminMembershipsController,
    AdminRewardsDealsController,
    AdminInvitationsController,
    AdminPendingReviewController,
    AdminAuditLogController,
    AdminContentController,
    AdminLocationsController,
    AdminReportsController,
    AdminSettingsReportsController,
  ],
  providers: [
    AdminRoleGuard,
    AdminAuditService,
    AdminOverviewService,
    AdminUsersService,
    AdminGroupsService,
    AdminDirectoryService,
    AdminConfigService,
    AdminCatalogService,
    AdminOperationsService,
  ],
})
export class AdminModule {}
