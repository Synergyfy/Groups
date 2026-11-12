import type {
  BusinessDirectoryEntry,
  BusinessProfile,
  CampaignRef,
  MembershipProgramme,
  Relationship,
} from "../domain/types";

export const CURRENT_BUSINESS: BusinessProfile = {
  id: "",
  businessName: "",
  contactName: "",
  email: "",
  category: "",
  city: "",
  localArea: "",
  joinedAt: "",
  nationalCommunity: { name: "", status: "Member", joinedAt: "" },
};

export const RELATIONSHIPS: Relationship[] = [];
export const CAMPAIGNS: CampaignRef[] = [];
export const PROGRAMMES: MembershipProgramme[] = [];
export const DIRECTORY: BusinessDirectoryEntry[] = [];

export function findDirectoryEntry(id: string): BusinessDirectoryEntry {
  return {
    id,
    name: id,
    contactName: id,
    city: "",
    category: "",
  };
}
