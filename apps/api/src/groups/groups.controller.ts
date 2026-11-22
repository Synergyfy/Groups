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
import { AdminOnly } from "../admin/admin-only.decorator.js";
import { CreateGroupDto } from "./dto/create-group.dto.js";
import { ListGroupsQueryDto } from "./dto/list-groups-query.dto.js";
import { UpdateGroupDto } from "./dto/update-group.dto.js";
import { GroupsService } from "./groups.service.js";

@Controller("groups")
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  findAll(@Query() query: ListGroupsQueryDto) {
    return this.groupsService.findAll(query.visibility);
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.groupsService.findOne(id);
  }

  /**
   * The unauthenticated business dashboard never uses this controller; its
   * plan-aware group routes live under `/business/groups`. Keep this legacy
   * CRUD administrator-only so it cannot be used to create or mutate groups
   * outside the plan/quota and ownership checks.
   */
  @Post()
  @AdminOnly()
  create(@Body() dto: CreateGroupDto) {
    return this.groupsService.create(dto);
  }

  @Patch(":id")
  @AdminOnly()
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groupsService.update(id, dto);
  }

  @Delete(":id")
  @AdminOnly()
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.groupsService.remove(id);
  }
}
