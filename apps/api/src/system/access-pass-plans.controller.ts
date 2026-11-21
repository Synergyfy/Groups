import { Controller, Get, UseGuards } from "@nestjs/common";
import { SystemApiKeyGuard } from "./system-api-key.guard.js";
import { SystemPlansService } from "./system-plans.service.js";

@Controller("v1/access-passes/plans")
@UseGuards(SystemApiKeyGuard)
export class AccessPassPlansController {
  constructor(private readonly plans: SystemPlansService) {}

  @Get()
  list() {
    return this.plans.listAccessPassPlans();
  }
}
