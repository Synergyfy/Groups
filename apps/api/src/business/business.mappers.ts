import type {
  Business,
  BusinessPlan,
  Circle,
  CircleActivity,
  NetworkContact,
  NetworkList,
} from "../generated/prisma/client.js";
import { iso, jsonObject } from "../admin/admin.mappers.js";
import { fromMinorPence } from "../common/money.js";

export function mapBusinessPlan(
  plan: BusinessPlan,
) {
  return {
    id: plan.id,
    businessId: plan.businessId,
    variant: plan.variant,
    planId: plan.planId ?? undefined,
    planName: plan.planName,
    status: plan.status,
    paid: plan.paid,
    accessDays: plan.accessDays,
    accessFee: fromMinorPence(plan.accessFeeMinor),
    accessFeeMinor: plan.accessFeeMinor,
    agreementAccepted: plan.agreementAccepted,
    agreedAt: iso(plan.agreedAt),
    accessExpiresAt: iso(plan.accessExpiresAt),
    accessSource: plan.accessSource,
    externalPlanId: plan.externalPlanId ?? undefined,
    membershipName: plan.membershipName ?? undefined,
    accessReason: plan.accessReason ?? undefined,
    upgradeUrl: plan.upgradeUrl ?? undefined,
  };
}

export function mapNetworkList(
  list: NetworkList & {
    contacts?: NetworkContact[];
    memberships?: Array<{ contact: NetworkContact & { memberships?: Array<{ listId: string }> } }>;
  },
) {
  const byId = new Map<string, NetworkContact & { memberships?: Array<{ listId: string }> }>();
  for (const contact of list.contacts ?? []) {
    byId.set(contact.id, contact);
  }
  for (const entry of list.memberships ?? []) {
    byId.set(entry.contact.id, entry.contact);
  }
  const merged = [...byId.values()];
  return {
    id: list.id,
    name: list.name,
    type: list.type,
    geography: list.geography,
    status: list.status,
    source: list.source,
    contactIds: merged.map((contact) => contact.id),
    contacts: merged.map(mapNetworkContact),
    createdAt: iso(list.createdAt),
  };
}

export function mapNetworkContact(
  contact: NetworkContact & { memberships?: Array<{ listId: string }> },
) {
  const listIds = Array.from(
    new Set([
      contact.listId,
      ...(contact.memberships?.map((entry) => entry.listId) ?? []),
    ]),
  );
  return {
    id: contact.id,
    listId: contact.listId,
    listIds,
    fullName: contact.fullName,
    email: contact.email ?? undefined,
    phone: contact.phone ?? undefined,
    mcomUserId: contact.mcomUserId ?? undefined,
    category: contact.category ?? undefined,
    location: contact.location ?? undefined,
    geography: contact.geography ?? undefined,
    role: contact.role,
    tier: contact.tier,
    confirmation: contact.confirmation,
    intake: contact.intake,
    consentAt: iso(contact.consentAt),
    addedAt: iso(contact.createdAt),
    addedByName: contact.addedByName,
  };
}

/**
 * A circle inherits the owning business's Central Hub location chain. The
 * chain is stored on the circle so the workspace can show where the circle
 * operates without re-resolving the postcode.
 */
export function mapCircleLocation(value: unknown) {
  const location = jsonObject(value);
  const city = String(location.city ?? "");
  const borough = String(location.borough ?? location.localArea ?? "");
  if (!city && !borough) return null;
  return {
    city: city || null,
    borough: borough || null,
    highStreet: String(location.highStreet ?? "") || null,
    localMall: String(location.localMall ?? "") || null,
    cityId: String(location.cityId ?? "") || null,
    boroughId: String(location.boroughId ?? "") || null,
    highStreetId: String(location.highStreetId ?? "") || null,
    localMallId: String(location.localMallId ?? "") || null,
  };
}

export function mapCircle(circle: Circle) {
  const config = jsonObject(circle.config);
  return {
    id: circle.id,
    type: circle.type,
    config: {
      name: String(config.name ?? ""),
      description: String(config.description ?? ""),
      duration: Number(config.duration ?? 90),
      visibility: String(config.visibility ?? "private"),
      interactionLevel: String(config.interactionLevel ?? "message"),
      location: mapCircleLocation(config.location),
    },
    memberIds: circle.memberIds,
    sourceListIds: circle.sourceListIds,
    status: circle.status,
    createdAt: iso(circle.createdAt),
    updatedAt: iso(circle.updatedAt),
  };
}

export function mapCircleActivity(activity: CircleActivity) {
  return {
    id: activity.id,
    circleId: activity.circleId,
    memberId: activity.memberId ?? undefined,
    kind: activity.kind,
    message: activity.message,
    at: iso(activity.at),
  };
}

export function mapBusinessDirectoryEntry(business: Business) {
  return {
    id: business.id,
    name: business.name,
    contactName: business.contactName,
    email: business.email,
    city: business.city,
    category: business.category,
    joinedAt: iso(business.joinedAt),
  };
}
