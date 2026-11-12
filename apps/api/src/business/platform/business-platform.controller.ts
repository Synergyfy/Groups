import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import type { SessionUser } from "../../auth/auth.types.js";
import { CurrentUser } from "../../auth/current-user.decorator.js";
import { BusinessOnly } from "../business-only.decorator.js";
import { BusinessContextService } from "../business-context.service.js";
import {
  ActivateMembershipDto,
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
  async config(@CurrentUser() user: SessionUser) {
    return this.platform.getConfig(await this.context.resolve(user));
  }

  @Get("membership")
  async membership(@CurrentUser() user: SessionUser) {
    return this.platform.getMembership(await this.context.resolve(user));
  }

  @Post("membership/activate")
  async activateMembership(
    @Body() dto: ActivateMembershipDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.platform.activateMembership(
      await this.context.resolve(user),
      dto,
    );
  }

  @Get("journey")
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

  @Get("community")
  async community(@CurrentUser() user: SessionUser) {
    return this.platform.getCommunity(await this.context.resolve(user));
  }

  @Get("location")
  async location(@CurrentUser() user: SessionUser) {
    return this.platform.getLocation(await this.context.resolve(user));
  }
}
