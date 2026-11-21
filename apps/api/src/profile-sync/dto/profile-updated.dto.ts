import { Type } from "class-transformer";
import {
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";

export class ProfileUpdatedEventDataDto {
  /** Central Hub event id. Delivery is at-least-once, so this is deduped. */
  @IsString()
  @MaxLength(200)
  eventId!: string;

  /** Immutable Central Hub user id whose profile changed. */
  @IsString()
  @MaxLength(200)
  userId!: string;

  @IsOptional()
  @IsISO8601()
  occurredAt?: string;
}

/** `profile.updated` push notification sent by Central Hub. */
export class ProfileUpdatedWebhookDto {
  @IsIn(["profile.updated"])
  event!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  platform?: string;

  @IsOptional()
  @IsISO8601()
  timestamp?: string;

  @ValidateNested()
  @Type(() => ProfileUpdatedEventDataDto)
  data!: ProfileUpdatedEventDataDto;
}
