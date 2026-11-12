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
  AddCircleMemberDto,
  BusinessCircleQueryDto,
  CreateCircleDto,
  UpdateCircleDto,
} from "../dto/business.dto.js";
import { BusinessCirclesService } from "./business-circles.service.js";

@Controller("business/circles")
@BusinessOnly()
export class BusinessCirclesController {
  constructor(
    private readonly circles: BusinessCirclesService,
    private readonly context: BusinessContextService,
  ) {}

  @Get()
  async list(
    @Query() query: BusinessCircleQueryDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.circles.list(await this.context.resolve(user), query);
  }

  @Post()
  async create(
    @Body() dto: CreateCircleDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.circles.create(await this.context.resolve(user), dto);
  }

  @Get(":id")
  async get(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: SessionUser) {
    return this.circles.get(await this.context.resolve(user), id);
  }

  @Patch(":id")
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCircleDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.circles.update(await this.context.resolve(user), id, dto);
  }

  @Delete(":id")
  async remove(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: SessionUser) {
    return this.circles.remove(await this.context.resolve(user), id);
  }

  @Get(":id/activity")
  async activity(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: SessionUser) {
    return this.circles.activity(await this.context.resolve(user), id);
  }

  @Post(":id/members")
  async addMember(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AddCircleMemberDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.circles.addMember(
      await this.context.resolve(user),
      id,
      dto,
    );
  }

  @Delete(":id/members/:memberId")
  async removeMember(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("memberId") memberId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.circles.removeMember(
      await this.context.resolve(user),
      id,
      memberId,
    );
  }
}
