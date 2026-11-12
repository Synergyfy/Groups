import {
  Body,
  Controller,
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
  AdminListQueryDto,
  UpdateAdminUserDto,
} from "../dto/admin.dto.js";
import { AdminUsersService } from "./users.service.js";

@Controller("admin/users")
@AdminOnly()
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  list(@Query() query: AdminListQueryDto) {
    return this.users.list(query);
  }

  @Get("registrations")
  registrations() {
    return this.users.getRegistrations();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.users.findOne(id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateAdminUserDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.users.update(id, dto, user);
  }

  @Post(":id/suspend")
  suspend(@Param("id") id: string, @CurrentUser() user: SessionUser) {
    return this.users.setStatus(id, "Suspended", user);
  }

  @Post(":id/activate")
  activate(@Param("id") id: string, @CurrentUser() user: SessionUser) {
    return this.users.setStatus(id, "Active", user);
  }
}
