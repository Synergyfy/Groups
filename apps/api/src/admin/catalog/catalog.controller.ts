import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import type { SessionUser } from "../../auth/auth.types.js";
import { CurrentUser } from "../../auth/current-user.decorator.js";
import { AdminOnly } from "../admin-only.decorator.js";
import {
  AdminListQueryDto,
  CreatePlanDto,
  CreateRewardDealDto,
  UpdatePlanDto,
  UpdateRewardDealDto,
} from "../dto/admin.dto.js";
import { AdminCatalogService } from "./catalog.service.js";

@Controller("admin/plans")
@AdminOnly()
export class AdminPlansController {
  constructor(private readonly catalog: AdminCatalogService) {}

  @Get()
  list(@Query() query: AdminListQueryDto) {
    return this.catalog.listPlans(query);
  }

  @Get("stats")
  stats() {
    return this.catalog.getPlanStats();
  }

  @Post()
  create(@Body() dto: CreatePlanDto, @CurrentUser() user: SessionUser) {
    return this.catalog.createPlans(dto, user);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdatePlanDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.catalog.updatePlan(id, dto, user);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: SessionUser) {
    return this.catalog.removePlan(id, user);
  }
}

@Controller("admin/rewards-deals")
@AdminOnly()
export class AdminRewardsDealsController {
  constructor(private readonly catalog: AdminCatalogService) {}

  @Get()
  list(@Query() query: AdminListQueryDto) {
    return this.catalog.listRewards(query);
  }

  @Get("stats")
  stats() {
    return this.catalog.getRewardStats();
  }

  @Post()
  create(
    @Body() dto: CreateRewardDealDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.catalog.createReward(dto, user);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateRewardDealDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.catalog.updateReward(id, dto, user);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: SessionUser) {
    return this.catalog.removeReward(id, user);
  }
}
