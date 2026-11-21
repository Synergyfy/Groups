import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { SystemApiKeyGuard } from "./system-api-key.guard.js";
import { SystemPlansService } from "./system-plans.service.js";

@Controller("v1/system/plans")
@UseGuards(SystemApiKeyGuard)
export class SystemPlansController {
  constructor(private readonly plans: SystemPlansService) {}

  @Get("schema")
  schema() {
    return this.plans.getSchema();
  }

  @Get()
  list() {
    return this.plans.listPlans();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.plans.getPlan(id);
  }

  @Post()
  create(@Body() body: Record<string, any>) {
    return this.plans.createPlan(body);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: Record<string, any>) {
    return this.plans.updatePlan(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.plans.deletePlan(id);
  }
}
