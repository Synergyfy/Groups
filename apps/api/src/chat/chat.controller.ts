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
  UseGuards,
} from "@nestjs/common";
import type { SessionUser } from "../auth/auth.types.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { ChatService } from "./chat.service.js";
import {
  ChatDirectoryQueryDto,
  ChatMessagesQueryDto,
  GroupParticipantDto,
  MarkChatReadDto,
  OpenDirectConversationDto,
  OpenGroupConversationDto,
  SendChatMessageDto,
  SetParticipantRoleDto,
  UpdateGroupSettingsDto,
} from "./dto/chat.dto.js";

/**
 * The browser never talks to Central Hub directly for REST — it calls this
 * app, which holds the long-lived Central Hub chat access token. Only the
 * single-use socket token is ever handed to the browser.
 */
@Controller("chat")
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get("session")
  async session(@CurrentUser() user: SessionUser) {
    return this.chat.getSocketSession(user);
  }

  @Get("conversations")
  async conversations(@CurrentUser() user: SessionUser) {
    return this.chat.listConversations(user);
  }

  @Post("conversations/direct")
  async openDirect(
    @CurrentUser() user: SessionUser,
    @Body() dto: OpenDirectConversationDto,
  ) {
    return this.chat.openDirectConversation(user, dto.memberId);
  }

  @Post("conversations/group")
  async openGroup(
    @CurrentUser() user: SessionUser,
    @Body() dto: OpenGroupConversationDto,
  ) {
    if (dto.groupId) {
      return this.chat.openGroupEntityConversation(user, dto.groupId, dto.title);
    }
    return this.chat.openGroupConversation(user, dto.circleId ?? "", dto.title);
  }

  @Post("conversations/:id/participants")
  async addParticipant(
    @CurrentUser() user: SessionUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: GroupParticipantDto,
  ) {
    return this.chat.addGroupParticipant(user, id, dto.memberId);
  }

  @Delete("conversations/:id/participants/:memberId")
  async removeParticipant(
    @CurrentUser() user: SessionUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("memberId") memberId: string,
  ) {
    return this.chat.removeGroupParticipant(user, id, memberId);
  }

  @Patch("conversations/:id")
  async updateGroup(
    @CurrentUser() user: SessionUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateGroupSettingsDto,
  ) {
    return this.chat.updateGroupSettings(user, id, {
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
      ...(dto.isAdminOnly !== undefined
        ? { isAdminOnly: dto.isAdminOnly }
        : {}),
    });
  }

  @Patch("conversations/:id/participants/:memberId")
  async setParticipantRole(
    @CurrentUser() user: SessionUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("memberId") memberId: string,
    @Body() dto: SetParticipantRoleDto,
  ) {
    return this.chat.setParticipantRole(user, id, memberId, dto.role);
  }

  @Post("conversations/:id/transfer-ownership")
  async transferOwnership(
    @CurrentUser() user: SessionUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: GroupParticipantDto,
  ) {
    return this.chat.transferOwnership(user, id, dto.memberId);
  }

  @Get("conversations/:id/messages")
  async messages(
    @CurrentUser() user: SessionUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: ChatMessagesQueryDto,
  ) {
    return this.chat.getMessages(user, id, query.cursor, query.limit ?? 50);
  }

  @Post("conversations/:id/messages")
  async sendMessage(
    @CurrentUser() user: SessionUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SendChatMessageDto,
  ) {
    return this.chat.sendMessage(user, id, dto.content, dto.idempotencyKey);
  }

  @Post("conversations/:id/read")
  async markRead(
    @CurrentUser() user: SessionUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: MarkChatReadDto,
  ) {
    return this.chat.markRead(user, id, dto.messageIds);
  }

  @Get("directory")
  async directory(
    @CurrentUser() user: SessionUser,
    @Query() query: ChatDirectoryQueryDto,
  ) {
    return this.chat.searchDirectory(user, query.q ?? "");
  }
}
