import { Type } from "class-transformer";
import {
  IsIn,
  IsISO8601,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";

export class MembershipSnapshotDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  planId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  planName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  tier?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  level?: string;

  /** `active` grants access; `expired`/`cancelled`/`inactive` revoke it. */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  billingCycle?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  currency?: string;

  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}

export class MembershipPackageDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  platform?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  packageName?: string;

  /** Must match a local `Plan.id` for quotas and plan-gated groups. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  externalPlanId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  status?: string;

  @IsOptional()
  @IsObject()
  limits?: Record<string, unknown>;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}

export class MembershipUpdatedEventDataDto {
  /** Central Hub event id. Delivery is at-least-once, so this is deduped. */
  @IsString()
  @MaxLength(200)
  eventId!: string;

  @IsOptional()
  @IsISO8601()
  occurredAt?: string;

  /** Immutable Central Hub user id whose membership changed. */
  @IsString()
  @MaxLength(200)
  userId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  businessId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => MembershipSnapshotDto)
  membership?: MembershipSnapshotDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => MembershipPackageDto)
  package?: MembershipPackageDto;
}

/** `membership.updated` push notification sent by Central Hub. */
export class MembershipUpdatedWebhookDto {
  @IsIn(["membership.updated"])
  event!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  platform?: string;

  @IsOptional()
  @IsISO8601()
  timestamp?: string;

  @ValidateNested()
  @Type(() => MembershipUpdatedEventDataDto)
  data!: MembershipUpdatedEventDataDto;
}
