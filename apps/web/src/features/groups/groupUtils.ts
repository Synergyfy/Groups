import type {
  AdminConfig,
  ContributionFrequency,
  Group,
  GroupTypeConfig,
  MandatoryGroupRule,
  UserGroupType,
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

/**
 * The administrator's "create these first" rules — the ones switched on.
 * Order is preserved so the checklist and the wizard always agree.
 */
export function mandatoryGroupRules(config: AdminConfig): MandatoryGroupRule[] {
  return (config.mandatoryGroups ?? []).filter((rule) => rule.required);
}

/**
 * Required group types the owner does not own yet. While this is not empty the
 * wizard offers these types and nothing else.
 */
export function pendingMandatoryTypes(
  config: AdminConfig,
  ownedTypes: Iterable<string>
): UserGroupType[] {
  const owned = new Set(ownedTypes);
  return mandatoryGroupRules(config)
    .filter((rule) => !owned.has(rule.type))
    .map((rule) => rule.type);
}

/**
 * Whether a type must be created as a paid group: the rule's paid switch is
 * on (Partner, by default) and the administrator allows paid groups at all.
 */
export function typeForcedPaid(config: AdminConfig, type: string): boolean {
  if (!config.paymentRules.allowPaid) return false;
  return mandatoryGroupRules(config).some(
    (rule) => rule.type === type && rule.pricing === "paid"
  );
}

export function groupsByType(groups: Group[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const group of groups) {
    counts.set(group.type, (counts.get(group.type) ?? 0) + 1);
  }
  return counts;
}
