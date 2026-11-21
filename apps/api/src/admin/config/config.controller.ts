import { Body, Controller, Get, Patch } from "@nestjs/common";
import type { SessionUser } from "../../auth/auth.types.js";
import { CurrentUser } from "../../auth/current-user.decorator.js";
import { AdminOnly } from "../admin-only.decorator.js";
import { AdminConfigService } from "./config.service.js";

@Controller("admin/config")
@AdminOnly()
export class AdminConfigController {
  constructor(private readonly config: AdminConfigService) {}

  @Get()
  get() {
    return this.config.getConfig();
  }

  @Patch()
  patch(
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: SessionUser,
  ) {
    return this.config.patchConfig(body, user);
  }

  @Get("group-rules")
  getGroupRules() {
    return this.config.getField("groupCreationRules");
  }

  @Patch("group-rules")
  patchGroupRules(
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: SessionUser,
  ) {
    return this.config.setField("groupCreationRules", body, user);
  }
}

@Controller("admin/settings")
@AdminOnly()
export class AdminSettingsController {
  constructor(private readonly config: AdminConfigService) {}

  @Get()
  get() {
    return this.config.getSettings();
  }

  @Patch()
  patch(
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: SessionUser,
  ) {
    return this.config.patchConfig({ platformSettings: body }, user);
  }
}
