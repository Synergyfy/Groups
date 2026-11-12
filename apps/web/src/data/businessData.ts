import type {
  BusinessDirectoryEntry,
  BusinessProfile,
  CampaignRef,
  MembershipProgramme,
  Relationship,
} from "../domain/types";
import { CONTACTS } from "./mockData";

export const CURRENT_BUSINESS: BusinessProfile = {
  id: "biz-smith",
  businessName: "Smith Business Ltd",
  contactName: "Alex Smith",
  email: "alex@smithbusiness.example",
  category: "Professional Services",
  city: "Birmingham",
  localArea: "Birmingham City Centre",
  joinedAt: "2026-03-12",
  nationalCommunity: { name: "National Community", status: "Member", joinedAt: "2026-03-12" },
  accountManagerId: "rel-am-jane",
  agentId: "rel-agent-john",
  consultantId: "rel-consultant-sarah",
  programmeId: "prog-247",
};

export const RELATIONSHIPS: Relationship[] = [
  {
    id: "rel-am-jane",
    kind: "account-manager",
    name: "Jane Smith",
    role: "Account Manager",
    email: "jane.smith@centralhub.example",
    phone: "+44 7700 900111",
  },
  {
    id: "rel-agent-john",
    kind: "agent",
    name: "John Smith",
    role: "Supporting this business",
    email: "john.smith@centralhub.example",
  },
  {
    id: "rel-consultant-sarah",
    kind: "consultant",
    name: "Sarah Cole",
    role: "Business Mentor",
    email: "sarah.cole@centralhub.example",
  },
];

export const CAMPAIGNS: CampaignRef[] = [
  {
    id: "camp-001",
    name: "Community Business Campaign",
    platform: "FundOrDonate",
    status: "Active",
    groupIds: ["grp-birmingham-biz", "grp-smith-marketing"],
  },
  {
    id: "camp-002",
    name: "Winter Support Drive",
    platform: "FundOrDonate",
    status: "Draft",
  },
];

export const PROGRAMMES: MembershipProgramme[] = [
  { id: "prog-247", name: "247 GBS Business Programme", tier: "Gold", status: "Active" },
  { id: "prog-partner", name: "Partner Membership Programme", tier: "Silver", status: "Active" },
];

const EXTRA_BUSINESSES: BusinessDirectoryEntry[] = [
  { id: "biz-green-market", name: "Green Market", contactName: "Ola Bank", city: "Birmingham", category: "Retail" },
  { id: "biz-fresh-living", name: "Fresh Living", contactName: "Nina Patel", city: "Birmingham", category: "Retail" },
  { id: "biz-urban-retail", name: "Urban Retail", contactName: "Owen Blake", city: "London", category: "Retail" },
  { id: "biz-city-foods", name: "City Foods", contactName: "Tariq Ahmed", city: "Birmingham", category: "Hospitality" },
  { id: "biz-central-retail", name: "Central Retail", contactName: "Mia Fraser", city: "Leeds", category: "Retail" },
  { id: "biz-urban-events", name: "Urban Events", contactName: "Noah Grant", city: "London", category: "Events" },
];

export const DIRECTORY: BusinessDirectoryEntry[] = [
  {
    id: CURRENT_BUSINESS.id,
    name: CURRENT_BUSINESS.businessName,
    contactName: CURRENT_BUSINESS.contactName,
    city: CURRENT_BUSINESS.city,
    category: CURRENT_BUSINESS.category,
    joinedAt: CURRENT_BUSINESS.joinedAt,
  },
  ...CONTACTS.map((contact) => ({
    id: contact.id,
    name: contact.businessName,
    contactName: contact.fullName,
    city: contact.location,
    category: contact.category,
    joinedAt: contact.joinedAt,
  })),
  ...EXTRA_BUSINESSES,
];

const DIRECTORY_INDEX = new Map(DIRECTORY.map((entry) => [entry.id, entry]));

export function findDirectoryEntry(id: string): BusinessDirectoryEntry {
  return (
    DIRECTORY_INDEX.get(id) ?? {
      id,
      name: id,
      contactName: "—",
      city: "—",
      category: "—",
    }
  );
}
