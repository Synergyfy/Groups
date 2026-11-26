import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { ContactsModule } from "../contacts/contact-onboarding.module.js";
import { GeographyModule } from "../geography/geography.module.js";
import { McomModule } from "../mcom/mcom.module.js";
import { BusinessAccessGuard } from "./business-access.guard.js";
import { BusinessContextService } from "./business-context.service.js";
import { BusinessLocationService } from "./business-location.service.js";
import { BusinessMediaService } from "./business.media.js";
import { CentralAccessService } from "./central-access.service.js";
import { BusinessRoleGuard } from "./business-role.guard.js";
import { BusinessCirclesController } from "./circles/business-circles.controller.js";
import { BusinessCirclesService } from "./circles/business-circles.service.js";
import { BusinessGroupsController } from "./groups/business-groups.controller.js";
import { BusinessGroupsService } from "./groups/business-groups.service.js";
import { BusinessInvitationsController } from "./invitations/business-invitations.controller.js";
import { BusinessInvitationsService } from "./invitations/business-invitations.service.js";
import { BusinessNetworkController } from "./network/business-network.controller.js";
import { BusinessNetworkService } from "./network/business-network.service.js";
import {
  BusinessAccountController,
  BusinessPlatformController,
} from "./platform/business-platform.controller.js";
import { BusinessPlatformService } from "./platform/business-platform.service.js";

@Module({
  imports: [AuthModule, McomModule, GeographyModule, ContactsModule],
  controllers: [
    BusinessAccountController,
    BusinessPlatformController,
    BusinessGroupsController,
    BusinessInvitationsController,
    BusinessNetworkController,
    BusinessCirclesController,
  ],
  providers: [
    BusinessRoleGuard,
    BusinessAccessGuard,
    BusinessContextService,
    BusinessLocationService,
    BusinessMediaService,
    CentralAccessService,
    BusinessGroupsService,
    BusinessInvitationsService,
    BusinessNetworkService,
    BusinessCirclesService,
    BusinessPlatformService,
  ],
  exports: [BusinessContextService, BusinessGroupsService, BusinessPlatformService],
})
export class BusinessModule {}
