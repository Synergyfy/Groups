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
  UpdatePlanDto,
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
