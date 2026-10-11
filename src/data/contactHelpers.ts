import type { CircleMember, NetworkContact, NetworkList } from "../domain/types";
import { CURRENT_BUSINESS } from "./businessData";
import { CONTACTS, LISTS } from "./mockData";

export interface ResolvedContact {
  member: CircleMember;
  pending: boolean;
  email?: string;
  phone?: string;
  intake?: NetworkContact["intake"];
}

export function toCircleMember(contact: NetworkContact): CircleMember {
  const day = contact.addedAt.slice(0, 10);
  const list = LISTS.find((entry) => entry.id === contact.listId);
  return {
    id: contact.id,
    fullName: contact.fullName,
    businessName: contact.fullName,
    category: "New contact",
    location: CURRENT_BUSINESS.city,
    geography: list?.geography ?? "National",
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
  const seeded: ResolvedContact[] = list.contactIds
    .map((id) => CONTACTS.find((contact) => contact.id === id))
    .filter((contact): contact is CircleMember => contact !== undefined)
    .map((member) => ({ member, pending: false }));
  return [...networkContacts.filter((c) => c.listId === list.id).map(resolveAdded), ...seeded];
}

export function resolveAllContacts(networkContacts: NetworkContact[]): ResolvedContact[] {
  const seeded: ResolvedContact[] = CONTACTS.map((member) => ({ member, pending: false }));
  return [...networkContacts.map(resolveAdded), ...seeded];
}
