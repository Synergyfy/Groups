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
  CreateBusinessDto,
  CreateCampaignDto,
  CreatePartnerDto,
  CreateProgrammeDto,
  CreateRelationshipDto,
  UpdateBusinessDto,
  UpdateCampaignDto,
  UpdatePartnerDto,
  UpdateProgrammeDto,
  UpdateRelationshipDto,
} from "../dto/admin.dto.js";
import { AdminDirectoryService } from "./directory.service.js";

@Controller("admin/businesses")
@AdminOnly()
export class AdminBusinessesController {
  constructor(private readonly directory: AdminDirectoryService) {}

  @Get()
  list(@Query() query: AdminListQueryDto) {
    return this.directory.listBusinesses(query);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.directory.findBusiness(id);
  }

  @Post()
  create(
    @Body() dto: CreateBusinessDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.directory.createBusiness(dto, user);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateBusinessDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.directory.updateBusiness(id, dto, user);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: SessionUser) {
    return this.directory.removeBusiness(id, user);
  }

  @Post(":id/verify")
  verify(@Param("id") id: string, @CurrentUser() user: SessionUser) {
    return this.directory.updateBusiness(id, { verified: true }, user);
  }

  @Post(":id/suspend")
  suspend(@Param("id") id: string, @CurrentUser() user: SessionUser) {
    return this.directory.updateBusiness(id, { status: "Suspended" }, user);
  }
}

@Controller("admin/partners")
@AdminOnly()
export class AdminPartnersController {
  constructor(private readonly directory: AdminDirectoryService) {}

  @Get()
  list(@Query() query: AdminListQueryDto) {
    return this.directory.listPartners(query);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.directory.findPartner(id);
  }

  @Post()
  create(@Body() dto: CreatePartnerDto, @CurrentUser() user: SessionUser) {
    return this.directory.createPartner(dto, user);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdatePartnerDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.directory.updatePartner(id, dto, user);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: SessionUser) {
    return this.directory.removePartner(id, user);
  }
}

@Controller("admin/programmes")
@AdminOnly()
export class AdminProgrammesController {
  constructor(private readonly directory: AdminDirectoryService) {}

  @Get()
  list() {
    return this.directory.listProgrammes();
  }

  @Post()
  create(@Body() dto: CreateProgrammeDto, @CurrentUser() user: SessionUser) {
    return this.directory.createProgramme(dto, user);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateProgrammeDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.directory.updateProgramme(id, dto, user);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: SessionUser) {
    return this.directory.removeProgramme(id, user);
  }
}

@Controller("admin/campaigns")
@AdminOnly()
export class AdminCampaignsController {
  constructor(private readonly directory: AdminDirectoryService) {}

  @Get()
  list(@Query() query: AdminListQueryDto) {
    return this.directory.listCampaigns(query);
  }

  @Post()
  create(@Body() dto: CreateCampaignDto, @CurrentUser() user: SessionUser) {
    return this.directory.createCampaign(dto, user);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateCampaignDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.directory.updateCampaign(id, dto, user);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: SessionUser) {
    return this.directory.removeCampaign(id, user);
  }
}

@Controller("admin/relationships")
@AdminOnly()
export class AdminRelationshipsController {
  constructor(private readonly directory: AdminDirectoryService) {}

  @Get()
  list(@Query() query: AdminListQueryDto) {
    return this.directory.listRelationships(query);
  }

  @Post()
  create(
    @Body() dto: CreateRelationshipDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.directory.createRelationship(dto, user);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateRelationshipDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.directory.updateRelationship(id, dto, user);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: SessionUser) {
    return this.directory.removeRelationship(id, user);
  }
}

@Controller("admin/partner-groups")
@AdminOnly()
export class AdminPartnerGroupsController {
  constructor(private readonly directory: AdminDirectoryService) {}

  @Get()
  get() {
    return this.directory.getPartnerGroups();
  }
}
