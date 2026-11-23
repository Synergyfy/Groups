import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from "@nestjs/common";
import { AdminOnly } from "../admin/admin-only.decorator.js";
import { GeographyService } from "./geography.service.js";

/**
 * Read-only view of Central Hub's geography hierarchy plus an explicit cache
 * refresh. Geography data is managed exclusively in the Central Hub admin
 * console; Groups must never create or edit it.
 */
@Controller("admin/geography")
@AdminOnly()
export class AdminGeographyController {
  constructor(private readonly geography: GeographyService) {}

  @Get()
  summary() {
    return this.geography.getSummary();
  }

  @Get("boroughs/:boroughId")
  borough(@Param("boroughId") boroughId: string) {
    return this.geography.getBoroughDetail(boroughId);
  }

  @Post("sync")
  @HttpCode(HttpStatus.OK)
  async sync() {
    await this.geography.refresh();
    return this.geography.getSummary();
  }
}
