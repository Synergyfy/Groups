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
import type { SessionUser } from "../../auth/auth.types.js";
import { CurrentUser } from "../../auth/current-user.decorator.js";
import { BusinessOnly } from "../business-only.decorator.js";
import { BusinessContextService } from "../business-context.service.js";
import {
  BusinessGroupQueryDto,
  CreateBusinessGroupDto,
  InviteMembersDto,
  UpdateBusinessGroupDto,
} from "../dto/business.dto.js";
import { BusinessGroupsService } from "./business-groups.service.js";

@Controller("business/groups")
@BusinessOnly()
export class BusinessGroupsController {
  constructor(
    private readonly groups: BusinessGroupsService,
    private readonly context: BusinessContextService,
  ) {}

  @Get("dashboard")
  async dashboard(@CurrentUser() user: SessionUser) {
    return this.groups.getDashboard(await this.context.resolve(user));
  }

  @Get("mine")
  async mine(@CurrentUser() user: SessionUser) {
    return this.groups.getMineSections(await this.context.resolve(user));
  }

  @Get("mine/:section")
  async mineSection(
    @Param("section") section: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.groups.getMineSection(
      await this.context.resolve(user),
      section,
    );
  }

  @Get("explore")
  async explore(
    @Query() query: BusinessGroupQueryDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.groups.explore(await this.context.resolve(user), query);
  }

  @Get("network")
  async network(@CurrentUser() user: SessionUser) {
    return this.groups.getNetwork(await this.context.resolve(user));
  }

  @Post()
  async create(
    @Body() dto: CreateBusinessGroupDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.groups.create(await this.context.resolve(user), dto);
  }

  @Get(":id")
  async findOne(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: SessionUser) {
    return this.groups.getGroup(await this.context.resolve(user), id);
  }

  @Patch(":id")
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateBusinessGroupDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.groups.update(await this.context.resolve(user), id, dto);
  }

  @Post(":id/join")
  async join(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: SessionUser) {
    return this.groups.join(await this.context.resolve(user), id);
  }

  @Post(":id/leave")
  async leave(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: SessionUser) {
    return this.groups.leave(await this.context.resolve(user), id);
  }

  @Get(":id/members")
  async members(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: SessionUser) {
    return this.groups.getMembers(await this.context.resolve(user), id);
  }

  @Delete(":id/members/:memberId")
  async removeMember(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("memberId") memberId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.groups.removeMember(
      await this.context.resolve(user),
      id,
      memberId,
    );
  }

  @Get(":id/activity")
  async activity(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: SessionUser) {
    return this.groups.getActivity(await this.context.resolve(user), id);
  }

  @Get(":id/invitations")
  async invitations(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: SessionUser) {
    return this.groups.getGroupInvitations(
      await this.context.resolve(user),
      id,
    );
  }

  @Post(":id/invitations")
  async invite(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: InviteMembersDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.groups.invite(await this.context.resolve(user), id, dto);
  }
}
