import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import type { SessionUser } from "../../auth/auth.types.js";
import { CurrentUser } from "../../auth/current-user.decorator.js";
import { AllowLockedBusinessAccess } from "../business-access.decorator.js";
import { BusinessOnly } from "../business-only.decorator.js";
import { BusinessContextService } from "../business-context.service.js";
import {
  ActivatePlanDto,
  BusinessCampaignsQueryDto,
  BusinessDirectoryQueryDto,
  BusinessRewardsQueryDto,
  UpdateBusinessProfileDto,
} from "../dto/business.dto.js";
import { BusinessPlatformService } from "./business-platform.service.js";

@Controller("business")
@BusinessOnly()
export class BusinessAccountController {
  constructor(
    private readonly platform: BusinessPlatformService,
    private readonly context: BusinessContextService,
  ) {}

  @Get("overview")
  async overview(@CurrentUser() user: SessionUser) {
    return this.platform.getOverview(await this.context.resolve(user));
  }

  @Get("profile")
  @AllowLockedBusinessAccess()
  async profile(@CurrentUser() user: SessionUser) {
    return this.platform.getProfile(await this.context.resolve(user));
  }

  @Patch("profile")
  async updateProfile(
    @Body() dto: UpdateBusinessProfileDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.platform.updateProfile(
      await this.context.resolve(user),
      dto,
    );
  }

  @Get("config")
  @AllowLockedBusinessAccess()
  async config(@CurrentUser() user: SessionUser) {
    return this.platform.getConfig(await this.context.resolve(user));
  }

  @Get("plan")
  @AllowLockedBusinessAccess()
  async plan(@CurrentUser() user: SessionUser) {
    return this.platform.getPlan(await this.context.resolve(user));
  }

  @Post("plan/activate")
  @AllowLockedBusinessAccess()
  async activatePlan(
    @Body() dto: ActivatePlanDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.platform.activatePlan(
      await this.context.resolve(user),
      dto,
    );
  }

  @Get("journey")
  @AllowLockedBusinessAccess()
  async journey(@CurrentUser() user: SessionUser) {
    return this.platform.getJourney(await this.context.resolve(user));
  }
}

@Controller("business")
@BusinessOnly()
export class BusinessPlatformController {
  constructor(
    private readonly platform: BusinessPlatformService,
    private readonly context: BusinessContextService,
  ) {}

  @Get("directory")
  async directory(
    @Query() query: BusinessDirectoryQueryDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.platform.getDirectory(
      await this.context.resolve(user),
      query,
    );
  }

  @Get("locations")
  async locations(@CurrentUser() user: SessionUser) {
    return this.platform.getLocations(await this.context.resolve(user));
  }

  @Get("programmes")
  async programmes(@CurrentUser() user: SessionUser) {
    return this.platform.getProgrammes(await this.context.resolve(user));
  }

  @Get("campaigns")
  async campaigns(
    @Query() query: BusinessCampaignsQueryDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.platform.getCampaigns(
      await this.context.resolve(user),
      query,
    );
  }

  @Get("rewards")
  async rewards(
    @Query() query: BusinessRewardsQueryDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.platform.getRewards(await this.context.resolve(user), query);
  }

  @Post("rewards/:id/claim")
  async claimReward(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.platform.claimReward(await this.context.resolve(user), id);
  }

  @Get("community")
  async community(@CurrentUser() user: SessionUser) {
    return this.platform.getCommunity(await this.context.resolve(user));
  }

  @Get("location")
  async location(@CurrentUser() user: SessionUser) {
    return this.platform.getLocation(await this.context.resolve(user));
  }
}
