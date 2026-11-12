import type {
  AuditLog,
  Business,
  Campaign,
  ContentSection,
  Group,
  GroupActivity,
  GroupCircle,
  GroupMember,
  Invitation,
  MembershipPlan,
  Partner,
  PlatformAccount,
  Programme,
  Relationship,
  ReportSchedule,
  RewardDeal,
} from "../generated/prisma/client.js";

export const iso = (value: Date | null | undefined): string | undefined =>
  value ? value.toISOString() : undefined;

export const day = (value: Date | null | undefined): string | undefined =>
  value ? value.toISOString().slice(0, 10) : undefined;

export const jsonObject = (value: unknown): Record<string, unknown> =>
  (value ?? {}) as Record<string, unknown>;

export const jsonArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

type GroupWithMembers = Group & { members?: GroupMember[] };

export function mapGroup(group: GroupWithMembers) {
  return {
    id: group.id,
    name: group.name,
    slug: group.slug,
    description: group.description ?? undefined,
    type: group.type,
    source: group.source,
    headStart: group.headStart,
    purpose: group.purpose,
    ownerId: group.ownerId ?? undefined,
    ownerName: group.ownerName,
    memberIds: group.members?.map((member) => member.memberId) ?? [],
    memberCount: group.members?.length ?? group.memberCount,
    location:
      group.city || group.localArea
        ? {
            city: group.city ?? undefined,
            localArea: group.localArea ?? undefined,
          }
        : undefined,
    requiredSize: group.requiredSize ?? undefined,
    stage: group.stage ?? undefined,
    status: group.status,
    accessType: group.accessType,
    visibility: group.directoryVisibility ?? "directory",
    interactionLevel: group.interactionLevel ?? undefined,
    pricing: group.pricing,
    contribution: group.contribution ?? undefined,
    contributionFrequency: group.contributionFrequency ?? undefined,
    createdAt: day(group.createdAt),
    campaignIds: group.campaignIds,
    programmeId: group.programmeId ?? undefined,
    accountManagerId: group.accountManagerId ?? undefined,
    agentId: group.agentId ?? undefined,
    consultantId: group.consultantId ?? undefined,
  };
}

export function mapGroupMember(member: GroupMember) {
  return {
    id: member.memberId,
    membershipId: member.id,
    fullName: member.fullName,
    businessName: member.businessName ?? undefined,
    category: member.category ?? undefined,
    location: member.location ?? undefined,
    geography: member.geography ?? undefined,
    status: member.status,
    role: member.role,
    tier: member.tier,
    joinedAt: iso(member.joinedAt),
    lastActiveAt: iso(member.lastActiveAt),
    photoUrl: member.photoUrl ?? undefined,
  };
}

export function mapGroupActivity(activity: GroupActivity) {
  return {
    id: activity.id,
    groupId: activity.groupId,
    actorName: activity.actorName,
    kind: activity.kind,
    message: activity.message,
    at: iso(activity.at),
  };
}

export function mapGroupCircle(circle: GroupCircle) {
  return {
    id: circle.id,
    type: circle.type,
    config: jsonObject(circle.config),
    memberIds: circle.memberIds,
    sourceListIds: circle.sourceListIds,
    createdAt: iso(circle.createdAt),
  };
}

export function mapBusiness(business: Business) {
  return {
    id: business.id,
    name: business.name,
    contactName: business.contactName,
    email: business.email,
    phone: business.phone ?? undefined,
    city: business.city,
    localArea: business.localArea ?? undefined,
    category: business.category,
    status: business.status,
    verified: business.verified,
    tier: business.tier,
    joinedAt: day(business.joinedAt),
    programmeId: business.programmeId ?? undefined,
    accountManagerId: business.accountManagerId ?? undefined,
    agentId: business.agentId ?? undefined,
    consultantId: business.consultantId ?? undefined,
    isPartner: business.isPartner,
  };
}

export function mapPlatformAccount(account: PlatformAccount) {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    phone: account.phone ?? undefined,
    role: account.role,
    status: account.status,
    verified: account.verified,
    source: account.source,
    createdAt: iso(account.createdAt),
  };
}

export function mapPartner(partner: Partner) {
  return {
    id: partner.id,
    businessId: partner.businessId,
    businessName: partner.businessName,
    tier: partner.tier,
    status: partner.status,
    joinedAt: day(partner.joinedAt),
    programmeId: partner.programmeId ?? undefined,
    feeMonthly: partner.feeMonthly,
    permissions: jsonObject(partner.permissions),
    notes: partner.notes ?? undefined,
  };
}

export function mapProgramme(programme: Programme) {
  return {
    id: programme.id,
    name: programme.name,
    tier: programme.tier,
    status: programme.status,
    description: programme.description,
    monthlyFee: programme.monthlyFee,
    benefits: programme.benefits,
    groupCount: programme.groupCount,
  };
}

export function mapCampaign(campaign: Campaign) {
  return {
    id: campaign.id,
    name: campaign.name,
    platform: campaign.platform,
    status: campaign.status,
    groupIds: campaign.groupIds,
    budget: campaign.budget ?? undefined,
    startDate: day(campaign.startDate),
    endDate: day(campaign.endDate),
  };
}

export function mapRelationship(relationship: Relationship) {
  return {
    id: relationship.id,
    kind: relationship.kind,
    name: relationship.name,
    role: relationship.role,
    email: relationship.email,
    phone: relationship.phone ?? undefined,
    activeGroups: relationship.activeGroups,
  };
}

export function mapMembershipPlan(plan: MembershipPlan) {
  return {
    id: plan.id,
    tier: plan.tier,
    variant: plan.variant,
    name: plan.name,
    priceMonthly: plan.priceMonthly,
    billingFrequency: plan.billingFrequency,
    status: plan.status,
    groupQuota: plan.groupQuota,
    circleQuota: plan.circleQuota,
    revenueSharePercent: plan.revenueSharePercent,
    features: plan.features,
    subscriberCount: plan.subscriberCount,
  };
}

export function mapRewardDeal(deal: RewardDeal) {
  return {
    id: deal.id,
    title: deal.title,
    category: deal.category,
    discountValue: deal.discountValue,
    code: deal.code ?? undefined,
    targetAudience: deal.targetAudience,
    liveOnFrontend: deal.liveOnFrontend,
    status: deal.status,
    expiryDate: day(deal.expiryDate),
    claimsCount: deal.claimsCount,
    maxClaims: deal.maxClaims,
    sponsorBusiness: deal.sponsorBusiness,
  };
}

export function mapInvitation(invitation: Invitation) {
  return {
    id: invitation.id,
    groupId: invitation.groupId ?? undefined,
    circleId: invitation.circleId ?? undefined,
    direction: invitation.direction,
    kind: invitation.kind,
    inviteeId: invitation.inviteeId ?? undefined,
    inviteeName: invitation.inviteeName,
    inviteeEmail: invitation.inviteeEmail ?? undefined,
    inviteePhone: invitation.inviteePhone ?? undefined,
    inviteeRole: invitation.inviteeRole ?? undefined,
    claimedByAccountId: invitation.claimedByAccountId ?? undefined,
    invitedById: invitation.invitedById,
    invitedByName: invitation.invitedByName,
    status: invitation.status,
    createdAt: iso(invitation.createdAt),
    respondedAt: iso(invitation.respondedAt),
  };
}

export function mapAuditLog(entry: AuditLog) {
  return {
    id: entry.id,
    action: entry.action,
    actorId: entry.actorId,
    actorName: entry.actorName,
    targetType: entry.targetType,
    targetId: entry.targetId,
    targetName: entry.targetName,
    detail: entry.detail,
    at: iso(entry.at),
  };
}

export function mapContentSection(section: ContentSection) {
  return {
    id: section.id,
    label: section.label,
    draft: jsonObject(section.draft),
    published: jsonObject(section.published),
    status: section.status,
    publishedAt: iso(section.publishedAt),
    updatedAt: iso(section.updatedAt),
  };
}

export function mapReportSchedule(schedule: ReportSchedule) {
  return {
    id: schedule.id,
    name: schedule.name,
    type: schedule.type,
    frequency: schedule.frequency,
    recipients: schedule.recipients,
    status: schedule.status,
    lastRunAt: iso(schedule.lastRunAt),
  };
}
