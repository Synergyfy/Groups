import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

const GROUP_STATUSES = [
  "Active",
  "Draft",
  "Recruiting",
  "Pending Review",
  "Suspended",
  "Closed",
] as const;

export class AdminListQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  kind?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  targetType?: string;

  @IsOptional()
  @IsString()
  action?: string;
}

export class AdminPaymentQueryDto {
  @IsOptional()
  @IsIn([
    "all",
    "PENDING",
    "PAID",
    "FAILED",
    "CANCELLED",
    "REFUNDED",
    "PARTIALLY_REFUNDED",
    "PAID_UNFULFILLED",
  ])
  status?: string;

  @IsOptional()
  @IsIn(["all", "PLAN_ACCESS", "GROUP_CONTRIBUTION"])
  purpose?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

export class AdminRefundPaymentDto {
  /** Refund amount in minor units (pence). Omit for the remaining balance. */
  @IsOptional()
  @IsString()
  @MaxLength(32)
  amountMinor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class AdminGroupQueryDto {
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() localArea?: string;
  @IsOptional() @IsString() highStreet?: string;
  @IsOptional() @IsString() localMall?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() stage?: string;
  @IsOptional() @IsString() owner?: string;
  @IsOptional() @IsString() programme?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() pricing?: string;
  @IsOptional() @IsString() query?: string;
}

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

export class CreateGroupAdminDto {
  @IsString() @MaxLength(120) name!: string;
  @IsOptional() @IsString() @MaxLength(140) slug?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsString() @MaxLength(2048) imageUrl?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() @MaxLength(2000) purpose?: string;
  @IsOptional() @IsString() ownerId?: string;
  @IsOptional() @IsString() ownerName?: string;
  @IsOptional() @IsIn(GROUP_STATUSES) status?: string;
  @IsOptional() @IsString() accessType?: string;
  @IsOptional() @IsIn(["directory", "members"]) visibility?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() localArea?: string;
  @IsOptional() @IsString() @MaxLength(120) highStreet?: string;
  @IsOptional() @IsString() @MaxLength(120) localMall?: string;
  @IsOptional() @IsInt() @Min(0) requiredSize?: number;
  @IsOptional() @IsString() stage?: string;
  @IsOptional() @IsIn(["free", "paid"]) pricing?: string;
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredPlanIds?: string[];
  @IsOptional() @IsNumber() @Min(0) contribution?: number;
  @IsOptional() @IsString() contributionFrequency?: string;
  @IsOptional() @IsString() interactionLevel?: string;
  @IsOptional() @IsString() programmeId?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) campaignIds?: string[];
  @IsOptional() @IsString() accountManagerId?: string;
  @IsOptional() @IsString() agentId?: string;
  @IsOptional() @IsString() consultantId?: string;
}

export class UpdateGroupAdminDto {
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(140) slug?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsString() @MaxLength(2048) imageUrl?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() @MaxLength(2000) purpose?: string;
  @IsOptional() @IsString() ownerId?: string;
  @IsOptional() @IsString() ownerName?: string;
  @IsOptional() @IsIn(GROUP_STATUSES) status?: string;
  @IsOptional() @IsString() accessType?: string;
  @IsOptional() @IsIn(["directory", "members"]) visibility?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() localArea?: string;
  @IsOptional() @IsString() @MaxLength(120) highStreet?: string;
  @IsOptional() @IsString() @MaxLength(120) localMall?: string;
  @IsOptional() @IsInt() @Min(0) requiredSize?: number;
  @IsOptional() @IsString() stage?: string;
  @IsOptional() @IsIn(["free", "paid"]) pricing?: string;
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredPlanIds?: string[];
  @IsOptional() @IsNumber() @Min(0) contribution?: number;
  @IsOptional() @IsString() contributionFrequency?: string;
  @IsOptional() @IsString() interactionLevel?: string;
  @IsOptional() @IsString() programmeId?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) campaignIds?: string[];
  @IsOptional() @IsString() accountManagerId?: string;
  @IsOptional() @IsString() agentId?: string;
  @IsOptional() @IsString() consultantId?: string;
}

export class AddGroupMemberDto {
  @IsString() memberId!: string;
  @IsString() fullName!: string;
  @IsOptional() @IsString() businessName?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() geography?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() role?: string;
  @IsOptional() @IsString() tier?: string;
}

export class UpdateGroupRelationshipsDto {
  @IsOptional() @IsString() accountManagerId?: string;
  @IsOptional() @IsString() agentId?: string;
  @IsOptional() @IsString() consultantId?: string;
  @IsOptional() @IsString() programmeId?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() localArea?: string;
  @IsOptional() @IsString() @MaxLength(120) highStreet?: string;
  @IsOptional() @IsString() @MaxLength(120) localMall?: string;
}

export class UpdateMemberContributionDto {
  @IsIn(["paid", "pending", "overdue", "n/a"]) status!: string;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export class UpdateAdminUserDto {
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional()
  @IsIn(["Active", "Pending", "Suspended"])
  status?: string;
  @IsOptional() @IsBoolean() verified?: boolean;
  @IsOptional()
  @IsIn([
    "consumer",
    "business-invitee",
    "agent",
    "consultant",
    "account-manager",
    "partner",
  ])
  role?: string;
}

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

export class PlanVariantConfigDto {
  @IsNumber() @Min(0) priceMonthly!: number;
  @IsOptional() @IsIn(["Active", "Draft", "Closed"]) status?: string;
  @IsInt() @Min(0) groupQuota!: number;
  @IsInt() @Min(0) circleQuota!: number;
  @IsOptional() @IsNumber() @Min(0) revenueSharePercent?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) features?: string[];
}

/**
 * A plan is configured as one unit: Standard, Pro and Pro+ must always be
 * supplied together so every published plan offers the full variant set.
 */
export class CreatePlanDto {
  @IsString() @MaxLength(120) name!: string;
  @ValidateNested() @Type(() => PlanVariantConfigDto) standard!: PlanVariantConfigDto;
  @ValidateNested() @Type(() => PlanVariantConfigDto) pro!: PlanVariantConfigDto;
  @ValidateNested() @Type(() => PlanVariantConfigDto) proPlus!: PlanVariantConfigDto;
}

export class UpdatePlanDto {
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsIn(["Standard", "Pro", "Pro+"]) variant?: string;
  @IsOptional() @IsNumber() @Min(0) priceMonthly?: number;
  @IsOptional() @IsIn(["Active", "Draft", "Closed"]) status?: string;
  @IsOptional() @IsInt() @Min(0) groupQuota?: number;
  @IsOptional() @IsInt() @Min(0) circleQuota?: number;
  @IsOptional() @IsNumber() @Min(0) revenueSharePercent?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) features?: string[];
  @IsOptional() @IsInt() @Min(0) subscriberCount?: number;
}

