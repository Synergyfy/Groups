import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import type { SessionUser } from "../../auth/auth.types.js";
import { CurrentUser } from "../../auth/current-user.decorator.js";
import { AdminOnly } from "../admin-only.decorator.js";
import {
  AddGroupMemberDto,
  AdminGroupQueryDto,
  CreateGroupAdminDto,
  UpdateGroupAdminDto,
  UpdateGroupRelationshipsDto,
} from "../dto/admin.dto.js";
import { AdminGroupsService } from "./groups.service.js";

@Controller("admin/groups")
@AdminOnly()
export class AdminGroupsController {
  constructor(private readonly groups: AdminGroupsService) {}

  @Get()
  list(@Query() query: AdminGroupQueryDto) {
    return this.groups.list(query);
  }

  @Get("dashboard")
  dashboard() {
    return this.groups.getDashboard();
  }

  @Get("hub")
  hub() {
    return this.groups.getHub();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.groups.findOne(id);
  }

  @Post()
  create(
    @Body() dto: CreateGroupAdminDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.groups.create(dto, user);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateGroupAdminDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.groups.update(id, dto, user);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: SessionUser) {
    return this.groups.remove(id, user);
  }

  @Post(":id/approve")
  approve(@Param("id") id: string, @CurrentUser() user: SessionUser) {
    return this.groups.setStatus(
      id,
      "Active",
      "group-approved",
      "Group approved",
      user,
    );
  }

  @Post(":id/suspend")
  suspend(@Param("id") id: string, @CurrentUser() user: SessionUser) {
    return this.groups.setStatus(
      id,
      "Suspended",
      "group-suspended",
      "Group suspended",
      user,
    );
  }

  @Post(":id/close")
  close(@Param("id") id: string, @CurrentUser() user: SessionUser) {
    return this.groups.setStatus(
      id,
      "Closed",
      "group-closed",
      "Group closed",
      user,
    );
  }

  @Get(":id/members")
  members(@Param("id") id: string) {
    return this.groups.listMembers(id);
  }

  @Post(":id/members")
  addMember(
    @Param("id") id: string,
    @Body() dto: AddGroupMemberDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.groups.addMember(id, dto, user);
  }

  @Delete(":id/members/:memberId")
  removeMember(
    @Param("id") id: string,
    @Param("memberId") memberId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.groups.removeMember(id, memberId, user);
  }

  @Get(":id/activity")
  activity(@Param("id") id: string) {
    return this.groups.listActivity(id);
  }

  @Get(":id/relationships")
  relationships(@Param("id") id: string) {
    return this.groups.getRelationships(id);
  }

  @Patch(":id/relationships")
  updateRelationships(
    @Param("id") id: string,
    @Body() dto: UpdateGroupRelationshipsDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.groups.updateRelationships(id, dto, user);
  }

  @Get(":id/contribution")
  contribution(@Param("id") id: string) {
    return this.groups.getContribution(id);
  }

  @Get(":id/circles")
  circles(@Param("id") id: string) {
    return this.groups.listCircles(id);
  }

  @Get(":id/invitations")
  invitations(@Param("id") id: string) {
    return this.groups.listInvitations(id);
  }
}
