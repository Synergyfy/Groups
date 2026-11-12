import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

const GROUP_STATUSES = [
  "Active",
  "Recruiting",
  "Pending Review",
  "Suspended",
  "Closed",
] as const;

const BUSINESS_STATUSES = [
  "Active",
  "Pending",
  "Suspended",
  "Closed",
] as const;

const PARTNER_STATUSES = [
  "Active",
  "Suspended",
  "Pending",
  "Closed",
] as const;

const TIERS = ["Free", "Bronze", "Silver", "Gold", "Platinum"] as const;

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

export class AdminGroupQueryDto {
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() localArea?: string;
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
  @IsOptional() @IsInt() @Min(0) requiredSize?: number;
  @IsOptional() @IsString() stage?: string;
  @IsOptional() @IsIn(["free", "paid"]) pricing?: string;
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
  @IsOptional() @IsInt() @Min(0) requiredSize?: number;
  @IsOptional() @IsString() stage?: string;
  @IsOptional() @IsIn(["free", "paid"]) pricing?: string;
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
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export class UpdateAdminUserDto {
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsBoolean() verified?: boolean;
  @IsOptional() @IsString() role?: string;
}

// ---------------------------------------------------------------------------
// Businesses
// ---------------------------------------------------------------------------

export class CreateBusinessDto {
  @IsString() @MaxLength(160) name!: string;
  @IsString() @MaxLength(160) contactName!: string;
  @IsEmail() email!: string;
  @IsOptional() @IsString() phone?: string;
  @IsString() city!: string;
  @IsOptional() @IsString() localArea?: string;
  @IsString() category!: string;
  @IsOptional() @IsIn(BUSINESS_STATUSES) status?: string;
  @IsOptional() @IsBoolean() verified?: boolean;
  @IsOptional() @IsIn(TIERS) tier?: string;
  @IsOptional() @IsDateString() joinedAt?: string;
  @IsOptional() @IsString() programmeId?: string;
  @IsOptional() @IsString() accountManagerId?: string;
  @IsOptional() @IsString() agentId?: string;
  @IsOptional() @IsString() consultantId?: string;
  @IsOptional() @IsBoolean() isPartner?: boolean;
}

export class UpdateBusinessDto {
  @IsOptional() @IsString() @MaxLength(160) name?: string;
  @IsOptional() @IsString() @MaxLength(160) contactName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() localArea?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsIn(BUSINESS_STATUSES) status?: string;
  @IsOptional() @IsBoolean() verified?: boolean;
  @IsOptional() @IsIn(TIERS) tier?: string;
  @IsOptional() @IsDateString() joinedAt?: string;
  @IsOptional() @IsString() programmeId?: string;
  @IsOptional() @IsString() accountManagerId?: string;
  @IsOptional() @IsString() agentId?: string;
  @IsOptional() @IsString() consultantId?: string;
  @IsOptional() @IsBoolean() isPartner?: boolean;
}

// ---------------------------------------------------------------------------
// Partners
// ---------------------------------------------------------------------------

export class CreatePartnerDto {
  @IsString() businessId!: string;
  @IsString() businessName!: string;
  @IsOptional() @IsIn(TIERS) tier?: string;
  @IsOptional() @IsIn(PARTNER_STATUSES) status?: string;
  @IsOptional() @IsDateString() joinedAt?: string;
  @IsOptional() @IsString() programmeId?: string;
  @IsOptional() @IsNumber() @Min(0) feeMonthly?: number;
  @IsOptional() @IsObject() permissions?: Record<string, unknown>;
  @IsOptional() @IsString() notes?: string;
}

export class UpdatePartnerDto {
  @IsOptional() @IsString() businessId?: string;
  @IsOptional() @IsString() businessName?: string;
  @IsOptional() @IsIn(TIERS) tier?: string;
  @IsOptional() @IsIn(PARTNER_STATUSES) status?: string;
  @IsOptional() @IsDateString() joinedAt?: string;
  @IsOptional() @IsString() programmeId?: string;
  @IsOptional() @IsNumber() @Min(0) feeMonthly?: number;
  @IsOptional() @IsObject() permissions?: Record<string, unknown>;
  @IsOptional() @IsString() notes?: string;
}

// ---------------------------------------------------------------------------
// Programmes / campaigns / relationships
// ---------------------------------------------------------------------------

export class CreateProgrammeDto {
  @IsString() @MaxLength(160) name!: string;
  @IsOptional() @IsIn(TIERS) tier?: string;
  @IsOptional() @IsIn(["Active", "Draft", "Closed"]) status?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() @Min(0) monthlyFee?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) benefits?: string[];
  @IsOptional() @IsInt() @Min(0) groupCount?: number;
}

export class UpdateProgrammeDto {
  @IsOptional() @IsString() @MaxLength(160) name?: string;
  @IsOptional() @IsIn(TIERS) tier?: string;
  @IsOptional() @IsIn(["Active", "Draft", "Closed"]) status?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() @Min(0) monthlyFee?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) benefits?: string[];
  @IsOptional() @IsInt() @Min(0) groupCount?: number;
}

export class CreateCampaignDto {
  @IsString() @MaxLength(160) name!: string;
  @IsOptional() @IsString() platform?: string;
  @IsOptional() @IsIn(["Active", "Draft", "Closed", "Completed"]) status?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) groupIds?: string[];
  @IsOptional() @IsNumber() @Min(0) budget?: number;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
}

export class UpdateCampaignDto {
  @IsOptional() @IsString() @MaxLength(160) name?: string;
  @IsOptional() @IsString() platform?: string;
  @IsOptional() @IsIn(["Active", "Draft", "Closed", "Completed"]) status?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) groupIds?: string[];
  @IsOptional() @IsNumber() @Min(0) budget?: number;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
}

export class CreateRelationshipDto {
  @IsIn(["account-manager", "agent", "consultant"]) kind!: string;
  @IsString() name!: string;
  @IsString() role!: string;
  @IsEmail() email!: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsInt() @Min(0) activeGroups?: number;
}

export class UpdateRelationshipDto {
  @IsOptional() @IsIn(["account-manager", "agent", "consultant"]) kind?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() role?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsInt() @Min(0) activeGroups?: number;
}

// ---------------------------------------------------------------------------
// Memberships
// ---------------------------------------------------------------------------

export class CreateMembershipPlanDto {
  @IsIn(["Bronze", "Silver", "Gold", "Platinum"]) tier!: string;
  @IsIn(["Standard", "Pro", "Pro+"]) variant!: string;
  @IsString() name!: string;
  @IsOptional() @IsNumber() @Min(0) priceMonthly?: number;
  @IsOptional() @IsIn(["Monthly", "Annual"]) billingFrequency?: string;
  @IsOptional() @IsIn(["Active", "Draft", "Closed"]) status?: string;
  @IsOptional() @IsInt() @Min(0) groupQuota?: number;
  @IsOptional() @IsInt() @Min(0) circleQuota?: number;
  @IsOptional() @IsNumber() @Min(0) revenueSharePercent?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) features?: string[];
  @IsOptional() @IsInt() @Min(0) subscriberCount?: number;
}

export class UpdateMembershipPlanDto {
  @IsOptional() @IsIn(["Bronze", "Silver", "Gold", "Platinum"]) tier?: string;
  @IsOptional() @IsIn(["Standard", "Pro", "Pro+"]) variant?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsNumber() @Min(0) priceMonthly?: number;
  @IsOptional() @IsIn(["Monthly", "Annual"]) billingFrequency?: string;
  @IsOptional() @IsIn(["Active", "Draft", "Closed"]) status?: string;
  @IsOptional() @IsInt() @Min(0) groupQuota?: number;
  @IsOptional() @IsInt() @Min(0) circleQuota?: number;
  @IsOptional() @IsNumber() @Min(0) revenueSharePercent?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) features?: string[];
  @IsOptional() @IsInt() @Min(0) subscriberCount?: number;
}

// ---------------------------------------------------------------------------
// Rewards & deals
// ---------------------------------------------------------------------------

export class CreateRewardDealDto {
  @IsString() @MaxLength(160) title!: string;
  @IsIn(["voucher", "gift-card", "coupon", "incentive"]) category!: string;
  @IsString() discountValue!: string;
  @IsOptional() @IsString() code?: string;
  @IsString() targetAudience!: string;
  @IsOptional() @IsBoolean() liveOnFrontend?: boolean;
  @IsOptional() @IsIn(["Active", "Draft", "Expired"]) status?: string;
  @IsDateString() expiryDate!: string;
  @IsOptional() @IsInt() @Min(0) claimsCount?: number;
  @IsOptional() @IsInt() @Min(0) maxClaims?: number;
  @IsOptional() @IsString() sponsorBusiness?: string;
}

export class UpdateRewardDealDto {
  @IsOptional() @IsString() @MaxLength(160) title?: string;
  @IsOptional() @IsIn(["voucher", "gift-card", "coupon", "incentive"]) category?: string;
  @IsOptional() @IsString() discountValue?: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() targetAudience?: string;
  @IsOptional() @IsBoolean() liveOnFrontend?: boolean;
  @IsOptional() @IsIn(["Active", "Draft", "Expired"]) status?: string;
  @IsOptional() @IsDateString() expiryDate?: string;
  @IsOptional() @IsInt() @Min(0) claimsCount?: number;
  @IsOptional() @IsInt() @Min(0) maxClaims?: number;
  @IsOptional() @IsString() sponsorBusiness?: string;
}

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

export class CreateLocationCityDto {
  @IsString() @MaxLength(120) name!: string;
}

export class CreateLocationAreaDto {
  @IsString() @MaxLength(120) name!: string;
}

export class UpdateLocationDto {
  @IsString() @MaxLength(120) name!: string;
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

export class UpdateContentSectionDto {
  @IsOptional() @IsObject() draft?: Record<string, unknown>;
  @IsOptional() @IsObject() published?: Record<string, unknown>;
}
