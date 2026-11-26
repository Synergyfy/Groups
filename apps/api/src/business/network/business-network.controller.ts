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
  AssignContactListsDto,
  BusinessNetworkContactQueryDto,
  ConfirmNetworkContactDto,
  CreateNetworkContactDto,
  CreateNetworkListDto,
  UpdateContactStatusDto,
  UpdateNetworkListDto,
} from "../dto/business.dto.js";
import { BusinessNetworkService } from "./business-network.service.js";

@Controller("business/network")
@BusinessOnly()
export class BusinessNetworkController {
  constructor(
    private readonly network: BusinessNetworkService,
    private readonly context: BusinessContextService,
  ) {}

  @Get("stats")
  async stats(@CurrentUser() user: SessionUser) {
    return this.network.stats(await this.context.resolve(user));
  }

  @Get("lists")
  async lists(@CurrentUser() user: SessionUser) {
    return this.network.listLists(await this.context.resolve(user));
  }

  @Post("lists")
  async createList(
    @Body() dto: CreateNetworkListDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.network.createList(await this.context.resolve(user), dto);
  }

  @Get("lists/:id")
  async list(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: SessionUser) {
    return this.network.getList(await this.context.resolve(user), id);
  }

  @Patch("lists/:id")
  async updateList(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateNetworkListDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.network.updateList(
      await this.context.resolve(user),
      id,
      dto,
    );
  }

  @Delete("lists/:id")
  async removeList(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: SessionUser) {
    return this.network.removeList(await this.context.resolve(user), id);
  }

  @Get("contacts")
  async contacts(
    @Query() query: BusinessNetworkContactQueryDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.network.listContacts(
      await this.context.resolve(user),
      query,
    );
  }

  @Post("contacts")
  async createContact(
    @Body() dto: CreateNetworkContactDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.network.createContact(await this.context.resolve(user), dto);
  }

  @Get("contacts/:id")
  async contact(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: SessionUser) {
    return this.network.getContact(await this.context.resolve(user), id);
  }

  @Post("contacts/:id/confirm")
  async confirmContact(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ConfirmNetworkContactDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.network.confirmContact(
      await this.context.resolve(user),
      id,
      dto,
    );
  }

  @Patch("contacts/:id/confirm")
  async confirmContactPatch(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ConfirmNetworkContactDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.network.confirmContact(
      await this.context.resolve(user),
      id,
      dto,
    );
  }

  @Post("contacts/:id/lists")
  async assignContactLists(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AssignContactListsDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.network.assignContactLists(
      await this.context.resolve(user),
      id,
      dto.listIds,
    );
  }

  @Patch("contacts/:id/status")
  async updateContactStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactStatusDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.network.updateContactStatus(
      await this.context.resolve(user),
      id,
      dto.confirmation,
    );
  }

  @Delete("contacts/:id")
  async removeContact(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.network.removeContact(await this.context.resolve(user), id);
  }
}
