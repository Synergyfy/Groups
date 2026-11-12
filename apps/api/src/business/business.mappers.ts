import type {
  Business,
  BusinessMembership,
  Circle,
  CircleActivity,
  NetworkContact,
  NetworkList,
} from "../generated/prisma/client.js";
import { iso, jsonObject } from "../admin/admin.mappers.js";

export function mapBusinessMembership(
  membership: BusinessMembership,
) {
  return {
    id: membership.id,
    businessId: membership.businessId,
    tier: membership.tier,
    variant: membership.variant,
    planId: membership.planId ?? undefined,
    planName: membership.planName,
    status: membership.status,
    paid: membership.paid,
    accessDays: membership.accessDays,
    accessFee: membership.accessFee,
    agreementAccepted: membership.agreementAccepted,
    agreedAt: iso(membership.agreedAt),
    accessExpiresAt: iso(membership.accessExpiresAt),
  };
}

export function mapNetworkList(
  list: NetworkList & { contacts?: NetworkContact[] },
) {
  return {
    id: list.id,
    name: list.name,
    type: list.type,
    geography: list.geography,
    status: list.status,
    source: list.source,
    contactIds: list.contacts?.map((contact) => contact.id) ?? [],
    contacts: list.contacts?.map(mapNetworkContact),
    createdAt: iso(list.createdAt),
  };
}

export function mapNetworkContact(contact: NetworkContact) {
  return {
    id: contact.id,
    listId: contact.listId,
    fullName: contact.fullName,
    email: contact.email ?? undefined,
    phone: contact.phone ?? undefined,
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
