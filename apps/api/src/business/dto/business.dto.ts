import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

const TIERS = ["Bronze", "Silver", "Gold", "Platinum"] as const;
const VARIANTS = ["Standard", "Pro", "Pro+"] as const;
const ACCESS_TYPES = ["open", "request", "eligibility", "invitation"] as const;
const VISIBILITIES = ["directory", "members"] as const;
const INTERACTION_LEVELS = ["read", "message", "collaborate"] as const;
const PRICING_MODES = ["free", "paid"] as const;
const CONTRIBUTION_FREQUENCIES = ["once", "daily", "weekly", "monthly"] as const;
const GROUP_STATUSES = [
  "Active",
  "Recruiting",
  "Pending Review",
  "Suspended",
  "Closed",
] as const;
const LIST_TYPES = ["B2B", "B2C"] as const;
const GEOGRAPHIES = ["Nearby", "Hyperlocal", "National", "Global"] as const;
const LIST_STATUSES = ["Active", "Inactive"] as const;
const LIST_SOURCES = [
  "Manual Contacts",
  "QR Plaque Scans",
  "Affiliate Signups",
  "Traffic & Leads Directory",
] as const;
const MEMBER_ROLES = ["core", "peripheral", "banker", "partner"] as const;
const CIRCLE_VISIBILITIES = ["private", "invite only", "public"] as const;
const PARTICIPANT_ROLES = ["business-invitee", "consumer"] as const;

export class BusinessGroupQueryDto {
  @IsOptional() @IsString() @MaxLength(120) search?: string;
  @IsOptional() @IsString() @MaxLength(80) type?: string;
  @IsOptional() @IsString() @MaxLength(80) city?: string;
  @IsOptional() @IsString() @MaxLength(80) localArea?: string;
  @IsOptional() @IsString() @MaxLength(120) highStreet?: string;
  @IsOptional() @IsString() @MaxLength(120) localMall?: string;
  @IsOptional() @IsIn(PRICING_MODES) pricing?: string;
  @IsOptional() @IsIn(GROUP_STATUSES) status?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

export class BusinessInvitationQueryDto {
  @IsOptional()
  @IsIn(["incoming", "outgoing", "requests", "owner-requests", "all"])
  tab?: string;
  @IsOptional() @IsIn(["pending", "accepted", "declined", "cancelled"]) status?: string;
  @IsOptional() @IsString() groupId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

export class BusinessNetworkContactQueryDto {
  @IsOptional() @IsUUID() listId?: string;
  @IsOptional() @IsString() @MaxLength(120) search?: string;
  @IsOptional() @IsIn(["pending", "confirmed"]) confirmation?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

export class BusinessCircleQueryDto {
  @IsOptional() @IsString() @MaxLength(120) search?: string;
  @IsOptional() @IsString() @MaxLength(120) type?: string;
  @IsOptional() @IsIn(["Active", "Inactive"]) status?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

export class BusinessDirectoryQueryDto {
  @IsOptional() @IsString() @MaxLength(120) search?: string;
  @IsOptional() @IsString() @MaxLength(80) city?: string;
  @IsOptional() @IsString() @MaxLength(80) category?: string;
  /** Exclude businesses already in this group (members or pending invitees). */
  @IsOptional() @IsUUID() excludeGroupId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

export class BusinessRewardsQueryDto {
  @IsOptional() @IsString() @MaxLength(80) category?: string;
  @IsOptional() @IsString() @MaxLength(120) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

export class BusinessCampaignsQueryDto {
  @IsOptional() @IsString() @MaxLength(80) status?: string;
  @IsOptional() @IsString() groupId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

export class CreateBusinessGroupDto {
  @IsString() @MaxLength(120) name!: string;
  @IsString() @MaxLength(80) type!: string;
  @IsString() @MaxLength(2000) purpose!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsIn(ACCESS_TYPES) accessType?: string;
  @IsOptional() @IsIn(VISIBILITIES) visibility?: string;
  @IsOptional() @IsIn(INTERACTION_LEVELS) interactionLevel?: string;
  @IsOptional() @IsIn(PRICING_MODES) pricing?: string;
  @IsOptional() @IsNumber() @Min(0) contribution?: number;
  @IsOptional() @IsIn(CONTRIBUTION_FREQUENCIES) contributionFrequency?: string;
  @IsOptional() @IsString() @MaxLength(80) city?: string;
  @IsOptional() @IsString() @MaxLength(80) localArea?: string;
  @IsOptional() @IsString() @MaxLength(120) highStreet?: string;
  @IsOptional() @IsString() @MaxLength(120) localMall?: string;
  @IsOptional() @IsInt() @Min(0) requiredSize?: number;
  @IsOptional() @IsString() @MaxLength(80) stage?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) campaignIds?: string[];
}

export class UpdateBusinessGroupDto {
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(2000) purpose?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  /** Owners may close their group; activation status is server-managed. */
  @IsOptional() @IsIn(["Closed"]) status?: string;
  @IsOptional() @IsIn(ACCESS_TYPES) accessType?: string;
  @IsOptional() @IsIn(VISIBILITIES) visibility?: string;
  @IsOptional() @IsIn(INTERACTION_LEVELS) interactionLevel?: string;
  @IsOptional() @IsIn(PRICING_MODES) pricing?: string;
  @IsOptional() @IsNumber() @Min(0) contribution?: number;
  @IsOptional() @IsIn(CONTRIBUTION_FREQUENCIES) contributionFrequency?: string;
  @IsOptional() @IsString() @MaxLength(80) city?: string;
  @IsOptional() @IsString() @MaxLength(80) localArea?: string;
  @IsOptional() @IsString() @MaxLength(120) highStreet?: string;
  @IsOptional() @IsString() @MaxLength(120) localMall?: string;
  @IsOptional() @IsInt() @Min(0) requiredSize?: number;
  @IsOptional() @IsString() @MaxLength(80) stage?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) campaignIds?: string[];
}

export class CreateGroupActivityDto {
  @IsString() @MaxLength(2000) message!: string;
}

export class InviteEntryDto {
  @IsOptional() @IsString() inviteeId?: string;
  @IsString() @MaxLength(160) inviteeName!: string;
  @IsOptional() @IsEmail() inviteeEmail?: string;
  @IsOptional() @IsString() @MaxLength(40) inviteePhone?: string;
  @IsOptional() @IsIn(PARTICIPANT_ROLES) inviteeRole?: string;
}

export class InviteMembersDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => InviteEntryDto)
  entries!: InviteEntryDto[];
}

export class RespondInvitationDto {
  @IsBoolean() accept!: boolean;
}

// ---------------------------------------------------------------------------
// Network lists / contacts
// ---------------------------------------------------------------------------

export class CreateNetworkListDto {
  @IsString() @MaxLength(160) name!: string;
  @IsIn(LIST_TYPES) type!: string;
  /**
   * Optional: the scope is derived from the business's Central Hub location
   * when the client does not send one.
   */
  @IsOptional() @IsIn(GEOGRAPHIES) geography?: string;
  @IsOptional() @IsIn(LIST_STATUSES) status?: string;
  @IsOptional() @IsIn(LIST_SOURCES) source?: string;
}

export class UpdateNetworkListDto {
  @IsOptional() @IsString() @MaxLength(160) name?: string;
  @IsOptional() @IsIn(LIST_TYPES) type?: string;
  @IsOptional() @IsIn(GEOGRAPHIES) geography?: string;
  @IsOptional() @IsIn(LIST_STATUSES) status?: string;
  @IsOptional() @IsIn(LIST_SOURCES) source?: string;
}

export class CreateNetworkContactDto {
  @IsUUID() listId!: string;
  @IsString() @MaxLength(160) fullName!: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(80) category?: string;
  @IsOptional() @IsString() @MaxLength(80) location?: string;
  @IsOptional() @IsIn(GEOGRAPHIES) geography?: string;
  @IsOptional() @IsIn(MEMBER_ROLES) role?: string;
  @IsOptional() @IsIn(TIERS) tier?: string;
  @IsOptional() @IsIn(["manual", "join-link"]) intake?: string;
  @IsOptional() @IsBoolean() consent?: boolean;
}

export class ConfirmNetworkContactDto {
  @IsOptional() @IsBoolean() consent?: boolean;
}

// ---------------------------------------------------------------------------
// Circles
// ---------------------------------------------------------------------------

export class CircleConfigDto {
  @IsString() @MaxLength(160) name!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsInt() @Min(1) @Max(365) duration?: number;
  @IsOptional() @IsIn(CIRCLE_VISIBILITIES) visibility?: string;
  @IsOptional() @IsIn(INTERACTION_LEVELS) interactionLevel?: string;
}

export class CreateCircleDto {
  @IsString() @MaxLength(120) type!: string;
  @ValidateNested()
  @Type(() => CircleConfigDto)
  config!: CircleConfigDto;
  @IsOptional() @IsArray() @IsString({ each: true }) memberIds?: string[];
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  sourceListIds?: string[];
}

export class UpdateCircleDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => CircleConfigDto)
  config?: CircleConfigDto;
  @IsOptional() @IsArray() @IsString({ each: true }) memberIds?: string[];
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  sourceListIds?: string[];
  @IsOptional() @IsIn(["Active", "Inactive"]) status?: string;
}

export class AddCircleMemberDto {
  @IsString() @MaxLength(120) memberId!: string;
}

// ---------------------------------------------------------------------------
// Membership access
// ---------------------------------------------------------------------------

export class ActivatePlanDto {
  @IsOptional() @IsString() @MaxLength(120) planId?: string;
  @IsOptional() @IsIn(VARIANTS) variant?: string;
  @IsOptional() @IsString() @MaxLength(160) planName?: string;
  @IsOptional() @IsInt() @IsIn([90, 180, 365]) accessDays?: number;
  @IsOptional() @IsNumber() @Min(0) accessFee?: number;
  @IsBoolean() agreementAccepted!: boolean;
}

/** Which covering entitlement should gate the dashboard. */
export class SelectPlanAccessSourceDto {
  @IsIn(["local", "central"])
  source!: "local" | "central";
}


