import { Body, Controller, Get, Patch, Put } from "@nestjs/common";
import type { SessionUser } from "../../auth/auth.types.js";
import { CurrentUser } from "../../auth/current-user.decorator.js";
import { AdminOnly } from "../admin-only.decorator.js";
import { AdminConfigService } from "./config.service.js";

const valueOf = (body: unknown): unknown =>
  Array.isArray(body)
    ? body
    : body && typeof body === "object" && "value" in body
      ? (body as { value: unknown }).value
      : body;

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

  @Get("automatic")
  getAutomatic() {
    return this.config.getField("automaticGrouping");
  }

  @Patch("automatic")
  patchAutomatic(
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: SessionUser,
  ) {
    return this.config.setField("automaticGrouping", body, user);
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

  @Get("types")
  getTypes() {
    return this.config.getField("groupTypes");
  }

  @Put("types")
  putTypes(@Body() body: unknown, @CurrentUser() user: SessionUser) {
    return this.config.setField("groupTypes", valueOf(body), user);
  }

  @Patch("types")
  patchTypes(@Body() body: unknown, @CurrentUser() user: SessionUser) {
    return this.config.setField("groupTypes", valueOf(body), user);
  }

  @Get("stages")
  getStages() {
    return this.config.getField("stageLabels");
  }

  @Put("stages")
  putStages(@Body() body: unknown, @CurrentUser() user: SessionUser) {
    return this.config.setField("stageLabels", valueOf(body), user);
  }

  @Get("payment-rules")
  getPaymentRules() {
    return this.config.getField("paymentRules");
  }

  @Patch("payment-rules")
  patchPaymentRules(
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: SessionUser,
  ) {
    return this.config.setField("paymentRules", body, user);
  }

  @Get("circles")
  getCircles() {
    return this.config.getField("circleTypes");
  }

  @Put("circles")
  putCircles(@Body() body: unknown, @CurrentUser() user: SessionUser) {
    return this.config.setField("circleTypes", valueOf(body), user);
  }

  @Patch("circles")
  patchCircles(@Body() body: unknown, @CurrentUser() user: SessionUser) {
    return this.config.setField("circleTypes", valueOf(body), user);
  }

  @Get("mandatory-circles")
  getMandatoryCircles() {
    return this.config.getField("mandatoryCircles");
  }

  @Put("mandatory-circles")
  putMandatoryCircles(
    @Body() body: unknown,
    @CurrentUser() user: SessionUser,
  ) {
    return this.config.setField("mandatoryCircles", valueOf(body), user);
  }

  @Get("mandatory-groups")
  getMandatoryGroups() {
    return this.config.getField("mandatoryGroups");
  }

  @Put("mandatory-groups")
  putMandatoryGroups(@Body() body: unknown, @CurrentUser() user: SessionUser) {
    return this.config.setField("mandatoryGroups", valueOf(body), user);
  }
}

@Controller("admin/permissions")
@AdminOnly()
export class AdminPermissionsController {
  constructor(private readonly config: AdminConfigService) {}

  @Get()
  get() {
    return this.config.getPermissions();
  }

  @Patch()
  patch(
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: SessionUser,
  ) {
    return this.config.patchConfig({ partnerDefaults: body }, user);
  }
}

@Controller("admin/access-rules")
@AdminOnly()
export class AdminAccessRulesController {
  constructor(private readonly config: AdminConfigService) {}

  @Get()
  get() {
    return this.config.getAccessRules();
  }

  @Patch()
  patch(
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: SessionUser,
  ) {
    return this.config.patchConfig({ accessRules: body }, user);
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
