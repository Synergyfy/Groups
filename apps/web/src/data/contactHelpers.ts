import type { CircleMember, NetworkContact, NetworkList } from "../domain/types";

export interface ResolvedContact {
  member: CircleMember;
  pending: boolean;
  email?: string;
  phone?: string;
  intake?: NetworkContact["intake"];
}

export function toCircleMember(contact: NetworkContact): CircleMember {
  const day = contact.addedAt.slice(0, 10);
  return {
    id: contact.id,
    fullName: contact.fullName,
    businessName: contact.fullName,
    category: "New contact",
    location: "",
    geography: "National",
    status: "active",
    role: "peripheral",
    tier: "Bronze",
    joinedAt: day,
    lastActiveAt: day,
  };
}

function resolveAdded(contact: NetworkContact): ResolvedContact {
  return {
    member: toCircleMember(contact),
    pending: contact.confirmation === "pending",
    email: contact.email,
    phone: contact.phone,
    intake: contact.intake,
  };
}

export function resolveContactsOfList(
  list: NetworkList,
  networkContacts: NetworkContact[]
): ResolvedContact[] {
  return networkContacts.filter((c) => c.listId === list.id).map(resolveAdded);
}

export function resolveAllContacts(networkContacts: NetworkContact[]): ResolvedContact[] {
  return networkContacts.map(resolveAdded);
}
