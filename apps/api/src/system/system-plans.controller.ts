import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  CreateSystemPlanDto,
  UpdateSystemPlanDto,
} from "./dto/system-plan.dto.js";
import { McomApiKeyGuard } from "./mcom-api-key.guard.js";
import { SYSTEM_PLAN_SCHEMA } from "./system-plan-schema.js";
import { SystemPlansService } from "./system-plans.service.js";

/**
 * MCOM Solutions billing connector. These routes live under
 * `/api/v1/system/plans` because that is the path the Central Hub generic
 * connector calls, unlike the rest of this API's `/api` routes.
 */
@Controller("v1/system/plans")
@UseGuards(McomApiKeyGuard)
export class SystemPlansController {
  constructor(private readonly plans: SystemPlansService) {}

  @Get()
  findAll() {
    return this.plans.findAll();
  }

  // Declared before `:id` so "schema" is never treated as a plan id.
  @Get("schema")
  schema() {
    return SYSTEM_PLAN_SCHEMA;
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.plans.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateSystemPlanDto) {
    return this.plans.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateSystemPlanDto) {
    return this.plans.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id") id: string) {
    await this.plans.remove(id);
  }
}
