import { Controller, Get } from "@nestjs/common";
import { AdminOnly } from "../admin-only.decorator.js";
import { AdminOverviewService } from "./overview.service.js";

@Controller("admin/overview")
@AdminOnly()
export class AdminOverviewController {
  constructor(private readonly overview: AdminOverviewService) {}

  @Get()
  getOverview() {
    return this.overview.getOverview();
  }
}
