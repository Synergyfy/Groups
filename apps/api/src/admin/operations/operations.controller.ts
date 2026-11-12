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
  AdminListQueryDto,
  CreateLocationAreaDto,
  CreateLocationCityDto,
  UpdateContentSectionDto,
  UpdateLocationDto,
} from "../dto/admin.dto.js";
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

@Controller("admin/pending-review")
@AdminOnly()
export class AdminPendingReviewController {
  constructor(private readonly operations: AdminOperationsService) {}

  @Get()
  list() {
    return this.operations.listPendingReview();
  }

  @Post(":id/approve")
  approve(@Param("id") id: string, @CurrentUser() user: SessionUser) {
    return this.operations.approvePendingGroup(id, user);
  }

  @Post(":id/reject")
  reject(@Param("id") id: string, @CurrentUser() user: SessionUser) {
    return this.operations.rejectPendingGroup(id, user);
  }
}

@Controller("admin/audit-log")
@AdminOnly()
export class AdminAuditLogController {
  constructor(private readonly operations: AdminOperationsService) {}

  @Get()
  list(@Query() query: AdminListQueryDto) {
    return this.operations.listAuditLog(query);
  }
}

@Controller("admin/content")
@AdminOnly()
export class AdminContentController {
  constructor(private readonly operations: AdminOperationsService) {}

  @Get()
  list() {
    return this.operations.listContent();
  }

  @Get("status")
  status() {
    return this.operations.getContentStatus();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.operations.getContentSection(id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateContentSectionDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.operations.updateContentSection(id, dto, user);
  }

  @Post(":id/publish")
  publish(@Param("id") id: string, @CurrentUser() user: SessionUser) {
    return this.operations.publishContentSection(id, user);
  }

  @Post("publish-all")
  publishAll(@CurrentUser() user: SessionUser) {
    return this.operations.publishAllContent(user);
  }
}

@Controller("admin/locations")
@AdminOnly()
export class AdminLocationsController {
  constructor(private readonly operations: AdminOperationsService) {}

  @Get()
  get() {
    return this.operations.getLocations();
  }

  @Post("cities")
  createCity(@Body() dto: CreateLocationCityDto) {
    return this.operations.createCity(dto);
  }

  @Patch("cities/:id")
  updateCity(@Param("id") id: string, @Body() dto: UpdateLocationDto) {
    return this.operations.updateCity(id, dto);
  }

  @Delete("cities/:id")
  removeCity(@Param("id") id: string) {
    return this.operations.removeCity(id);
  }

  @Post("cities/:cityId/areas")
  createArea(
    @Param("cityId") cityId: string,
    @Body() dto: CreateLocationAreaDto,
  ) {
    return this.operations.createArea(cityId, dto);
  }

  @Patch("areas/:id")
  updateArea(@Param("id") id: string, @Body() dto: UpdateLocationDto) {
    return this.operations.updateArea(id, dto);
  }

  @Delete("areas/:id")
  removeArea(@Param("id") id: string) {
    return this.operations.removeArea(id);
  }
}

@Controller("admin/reports")
@AdminOnly()
export class AdminReportsController {
  constructor(private readonly operations: AdminOperationsService) {}

  @Get()
  getGroupReport() {
    return this.operations.getGroupReport();
  }

  @Get("schedules")
  listSchedules() {
    return this.operations.listReportSchedules();
  }

  @Post("schedules")
  createSchedule(
    @Body()
    body: {
      name?: string;
      type?: string;
      frequency?: string;
      recipients?: string[];
      status?: string;
    },
    @CurrentUser() user: SessionUser,
  ) {
    return this.operations.createReportSchedule(body, user);
  }

  @Patch("schedules/:id")
  updateSchedule(
    @Param("id") id: string,
    @Body()
    body: {
      name?: string;
      type?: string;
      frequency?: string;
      recipients?: string[];
      status?: string;
    },
  ) {
    return this.operations.updateReportSchedule(id, body);
  }

  @Delete("schedules/:id")
  removeSchedule(@Param("id") id: string) {
    return this.operations.removeReportSchedule(id);
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
