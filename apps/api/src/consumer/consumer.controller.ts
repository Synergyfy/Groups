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
import type { SessionUser } from "../auth/auth.types.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { ConsumerOnly } from "./consumer-only.decorator.js";
import { ConsumerService } from "./consumer.service.js";

@Controller("consumer")
@ConsumerOnly()
export class ConsumerController {
  constructor(private readonly consumer: ConsumerService) {}

  @Get("profile")
  profile(@CurrentUser() user: SessionUser) {
    return this.consumer.profile(user);
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

  @Patch("invitations/:id/respond")
  respondInvitation(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Body("accept") accept: boolean,
  ) {
    return this.consumer.respondInvitation(user, id, accept === true);
  }
}
