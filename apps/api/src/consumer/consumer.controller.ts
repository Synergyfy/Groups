import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { SessionUser } from "../auth/auth.types.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { centralProfileConflict } from "../mcom/central-profile.js";
import { ConsumerOnly } from "./consumer-only.decorator.js";
import { ConsumerService } from "./consumer.service.js";
import { UpdateConsumerPreferencesDto } from "./dto/consumer.dto.js";

@Controller("consumer")
@ConsumerOnly()
export class ConsumerController {
  constructor(
    private readonly consumer: ConsumerService,
    private readonly config: ConfigService,
  ) {}

  @Get("profile")
  profile(@CurrentUser() user: SessionUser) {
    return this.consumer.profile(user);
  }

  /**
   * Identity data is owned by Central Hub. Kept as an explicit 409 so older
   * clients get a clear "edit in Central Hub" instruction instead of a 404.
   */
  @Patch("profile")
  updateProfile() {
    throw centralProfileConflict(this.config, "consumer");
  }

  /** Local-only communication preferences (not part of the Central profile). */
  @Patch("preferences")
  updatePreferences(
    @CurrentUser() user: SessionUser,
    @Body() dto: UpdateConsumerPreferencesDto,
  ) {
    return this.consumer.updatePreferences(user, dto);
  }

  @Get("dashboard")
  dashboard(@CurrentUser() user: SessionUser) {
    return this.consumer.dashboard(user);
  }

  @Get("groups")
  groups(@CurrentUser() user: SessionUser) {
    return this.consumer.groups(user);
  }

  @Get("groups/explore")
  explore(@Query("city") city?: string, @Query("search") search?: string) {
    return this.consumer.discover(city, search);
  }

  @Get("groups/:id")
  group(
    @CurrentUser() user: SessionUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.consumer.group(user, id);
  }

  @Get("groups/:id/activity")
  groupActivity(
    @CurrentUser() user: SessionUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.consumer.groupActivity(user, id);
  }

  @Get("circles")
  circles(@CurrentUser() user: SessionUser) {
    return this.consumer.circles(user);
  }

  @Get("circles/:id")
  circle(
    @CurrentUser() user: SessionUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.consumer.circle(user, id);
  }

  @Patch("groups/:id/join")
  join(
    @CurrentUser() user: SessionUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.consumer.join(user, id);
  }

  @Delete("groups/:id/leave")
  leave(
    @CurrentUser() user: SessionUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.consumer.leave(user, id);
  }

  @Post("groups/:id/activity")
  postActivity(
    @CurrentUser() user: SessionUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body("message") message: string,
  ) {
    return this.consumer.postActivity(user, id, message);
  }

  @Get("invitations")
  invitations(
    @CurrentUser() user: SessionUser,
    @Query("status") status?: string,
  ) {
    return this.consumer.invitations(user, status);
  }

  @Get("invitations/:id")
  invitation(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
  ) {
    return this.consumer.invitation(user, id);
  }

  @Patch("invitations/:id/respond")
  respondInvitation(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Body("accept") accept: boolean,
  ) {
    return this.consumer.respondInvitation(user, id, accept === true);
  }
}
