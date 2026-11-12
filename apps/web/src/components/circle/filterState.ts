import type { MemberRole } from "../../domain/types";

export interface CircleFilterState {
  category: string;
  location: string;
  activity: "all" | "active" | "inactive";
  role: "all" | MemberRole;
}

export const INITIAL_FILTERS: CircleFilterState = {
  category: "all",
  location: "all",
  activity: "all",
  role: "all",
};
