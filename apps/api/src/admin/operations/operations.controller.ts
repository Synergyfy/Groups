import { Controller, Get, Param, Post, Query } from "@nestjs/common";
import type { SessionUser } from "../../auth/auth.types.js";
import { CurrentUser } from "../../auth/current-user.decorator.js";
import { AdminOnly } from "../admin-only.decorator.js";
import { AdminListQueryDto } from "../dto/admin.dto.js";
import { AdminOperationsService } from "./operations.service.js";

@Controller("admin/invitations")
@AdminOnly()
export class AdminInvitationsController {
  constructor(private readonly operations: AdminOperationsService) {}

  @Get()
  list(@Query() query: AdminListQueryDto) {
    return this.operations.listInvitations(query);
  }

  @Get("counts")
  counts() {
    return this.operations.getInvitationCounts();
  }

  @Post(":id/approve")
  approve(@Param("id") id: string, @CurrentUser() user: SessionUser) {
    return this.operations.respondToInvitation(id, true, user);
  }

  @Post(":id/decline")
  decline(@Param("id") id: string, @CurrentUser() user: SessionUser) {
    return this.operations.respondToInvitation(id, false, user);
  }

  @Post(":id/cancel")
  cancel(@Param("id") id: string, @CurrentUser() user: SessionUser) {
    return this.operations.cancelInvitation(id, user);
  }
}

@Controller("admin/settings-reports")
@AdminOnly()
export class AdminSettingsReportsController {
  constructor(private readonly operations: AdminOperationsService) {}

  @Get()
  get() {
    return this.operations.getSettingsReport();
  }
}
