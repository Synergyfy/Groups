import type {
  AdminConfig,
  ContributionFrequency,
  Group,
  GroupTypeConfig,
} from "../../domain/types";

export function memberCountOf(group: Group): number {
  return group.memberCount ?? group.memberIds.length;
}

export function contributionLabel(
  group: Pick<Group, "pricing" | "contribution" | "contributionFrequency">
): string {
  if (group.pricing !== "paid") return "Free";
  const amount = group.contribution != null ? `£${group.contribution}` : "Contribution";
  const frequency: ContributionFrequency | undefined = group.contributionFrequency;
  if (!frequency || frequency === "once") return `${amount} per member`;
  return `${amount} ${frequency} per member`;
}

export function creatableGroupTypes(config: AdminConfig): GroupTypeConfig[] {
  return config.groupTypes.filter((entry) => entry.enabled && entry.allowCreate);
}

export function nonCreatableGroupTypes(config: AdminConfig): GroupTypeConfig[] {
  return config.groupTypes.filter((entry) => !entry.enabled || !entry.allowCreate);
}

export function groupsByType(groups: Group[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const group of groups) {
    counts.set(group.type, (counts.get(group.type) ?? 0) + 1);
  }
  return counts;
}
