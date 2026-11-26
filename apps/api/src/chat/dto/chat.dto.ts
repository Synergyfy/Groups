import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

/** Opens the canonical one-to-one conversation with a circle member. */
export class OpenDirectConversationDto {
  @IsUUID("4", {
    message: "The member id must be a valid id.",
  })
  memberId!: string;
}

/**
 * Opens (or creates) the group conversation of a circle.
 *
 * The business that owns the circle becomes the group owner and admin; the
 * circle members join as group members.
 */
export class OpenGroupConversationDto {
  @IsUUID("4", { message: "The circle id must be a valid id." })
  circleId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;
}

/** Names a circle member inside a group conversation. */
export class GroupParticipantDto {
  @IsString()
  @MaxLength(120)
  memberId!: string;
}

/** Group settings — admins only. */
export class UpdateGroupSettingsDto {  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  avatarUrl?: string;

  /** Turns the group into a broadcast channel: only admins may post. */
  @IsOptional()
  @IsBoolean()
  isAdminOnly?: boolean;
}

/** Promotes a member to group admin, or demotes an admin back to member. */
export class SetParticipantRoleDto {
  @IsIn(["ADMIN", "MEMBER"], { message: "role must be ADMIN or MEMBER" })
  role!: "ADMIN" | "MEMBER";
}

/** Sends a message through the Central Hub chat backbone. */
export class SendChatMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content!: string;

  /**
   * Stable id for the logical message. Retrying a send with the same key
   * never creates a duplicate on Central Hub.
   */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  idempotencyKey?: string;
}

/** Marks messages in a conversation as read. */
export class MarkChatReadDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  messageIds?: string[];
}

/** Cursor-paginated message history. */
export class ChatMessagesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

/** Searches the Central Hub people directory. */
export class ChatDirectoryQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;
}
