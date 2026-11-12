import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import type { SessionUser } from "../../auth/auth.types.js";
import { CurrentUser } from "../../auth/current-user.decorator.js";
import { BusinessOnly } from "../business-only.decorator.js";
import { BusinessContextService } from "../business-context.service.js";
import {
  BusinessInvitationQueryDto,
  RespondInvitationDto,
} from "../dto/business.dto.js";
import { BusinessInvitationsService } from "./business-invitations.service.js";

@Controller("business/invitations")
@BusinessOnly()
export class BusinessInvitationsController {
  constructor(
    private readonly invitations: BusinessInvitationsService,
    private readonly context: BusinessContextService,
  ) {}

  @Get()
  async list(
    @Query() query: BusinessInvitationQueryDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.invitations.list(await this.context.resolve(user), query);
  }

  @Get(":id")
  async get(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: SessionUser) {
    return this.invitations.get(await this.context.resolve(user), id);
  }

  @Post(":id/respond")
  async respond(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RespondInvitationDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.invitations.respond(
      await this.context.resolve(user),
      id,
      dto.accept,
    );
  }

  @Post(":id/accept")
  async accept(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: SessionUser) {
    return this.invitations.respond(
      await this.context.resolve(user),
      id,
      true,
    );
  }

  @Post(":id/decline")
  async decline(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: SessionUser) {
    return this.invitations.respond(
      await this.context.resolve(user),
      id,
      false,
    );
  }

  @Post(":id/cancel")
  async cancel(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: SessionUser) {
    return this.invitations.cancel(await this.context.resolve(user), id);
  }

  @Post(":id/resend")
  async resend(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: SessionUser) {
    return this.invitations.resend(await this.context.resolve(user), id);
  }
}
