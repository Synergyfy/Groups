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
  businessProfile?: Record<string, unknown> | null;
  customerProfile?: Record<string, unknown> | null;
  agentProfile?: Record<string, unknown> | null;
  consultantProfile?: Record<string, unknown> | null;
  accountManagerProfile?: Record<string, unknown> | null;
}

export interface McomEntitlement {
  access?: {
    hasAccess?: boolean;
    accessType?: string;
    reason?: string;
    upgradeUrl?: string;
  };
  whitelabel?: {
    enabled?: boolean;
    granted?: boolean;
    roleEligible?: boolean;
    grantedAt?: string | null;
  };
  plan?: {
    planId?: string;
    planName?: string;
    quotas?: Record<string, unknown>;
  };
  trialContext?: {
    programmeTasks?: unknown[];
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
  user?: McomProfile;
  profile?: McomProfile;
  entitlement?: McomEntitlement;
  entitlements?: McomEntitlement;
}
