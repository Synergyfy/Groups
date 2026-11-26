export type SessionRole =
  | "BUSINESS"
  | "CUSTOMER"
  | "AGENT"
  | "CONSULTANT"
  | "ACCOUNT_MANAGER"
  | "PARTNER"
  | "ADMIN";

export interface SessionUser {
  id: string;
  email: string;
  role: SessionRole;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  profileType?: string | null;
  businessName?: string | null;
  avatarUrl?: string | null;
}

export interface SessionTokenPayload {
  sub: string;
  email: string;
  role: SessionRole;
  name: string;
  profileType?: string | null;
}

export interface McomProfile {
  id?: string;
  sub?: string;
  email: string;
  role?: string;
  profileType?: string;
  isAffiliate?: boolean;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  name?: string | null;
  jobTitle?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  address?: string | null;
  postcode?: string | null;
  country?: string | null;
  businessId?: string | null;
  businessName?: string | null;
  membershipLevel?: string | null;
  membershipTier?: string | null;
  membershipStatus?: string | null;
  membershipPlanName?: string | null;
  membershipExpiresAt?: string | null;
  trialAccessExpiresAt?: string | null;
  /** Canonical geography resolved by Central Hub from the profile postcode. */
  location?: {
    postcode?: string | null;
    cityId?: string | null;
    city?: string | null;
    region?: string | null;
    country?: string | null;
    boroughId?: string | null;
    borough?: string | null;
    highStreetId?: string | null;
    highStreet?: string | null;
    localMallId?: string | null;
    localMall?: string | null;
  } | null;
  businessProfile?: Record<string, unknown> | null;
  customerProfile?: Record<string, unknown> | null;
  agentProfile?: Record<string, unknown> | null;
  consultantProfile?: Record<string, unknown> | null;
  accountManagerProfile?: Record<string, unknown> | null;
}

export type EntitlementAccessType =
  | "PAID_MEMBERSHIP"
  | "DIRECT_PACKAGE"
  | "TRIAL_PROGRAMME"
  | "NONE";

export type EntitlementPlanSource = "membership" | "direct" | "trial";

export interface PlatformEntitlementTask {
  taskId: string;
  title: string;
  description: string;
  deadlineDays: number;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "EXPIRED" | string;
}

/**
 * The Central Hub contract (`PlatformEntitlement`, protocol 2026-10-01).
 * Central Hub is the source of truth; this app only mirrors the verdict.
 */
export interface McomEntitlement {
  version?: string;
  targetPlatform?: {
    clientId?: string | null;
    platformSlug?: string | null;
    name?: string | null;
  };
  access?: {
    hasAccess?: boolean;
    accessType?: EntitlementAccessType | string;
    reason?: string;
    upgradeUrl?: string;
  };
  plan?: {
    planId?: string;
    planName?: string;
    source?: EntitlementPlanSource | string;
    status?: string;
    billingCycle?: string | null;
    expiresAt?: string | null;
    quotas?: Record<string, unknown>;
    limits?: Record<string, unknown>;
    features?: string[];
  } | null;
  membershipContext?: {
    membershipPlanName?: string | null;
    membershipLevel?: string;
    membershipStatus?: string;
    isIncludedInMembership?: boolean;
  };
  trialContext?: {
    isInTrial?: boolean;
    hasPaidVerificationFee?: boolean;
    trialExpiresAt?: string | null;
    daysRemaining?: number;
    programmeTasks?: PlatformEntitlementTask[];
  };
  whitelabel?: {
    enabled?: boolean;
    granted?: boolean;
    roleEligible?: boolean;
    grantedAt?: string | null;
  };
}

export interface McomTokenResponse {
  data?: McomTokenResponse;
  access_token?: string;
  accessToken?: string;
  refresh_token?: string;
  refreshToken?: string;
  token_type?: string;
  expires_in?: number;
  expiresIn?: number;
  user?: McomProfile;
  profile?: McomProfile;
  entitlement?: McomEntitlement;
  entitlements?: McomEntitlement;
}
