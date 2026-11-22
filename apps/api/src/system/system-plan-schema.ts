/**
 * Quotas this app understands for MCOM Central's dynamic plan form.
 * The `unlimited` flag lets the Central Hub show its "-1 = unlimited" toggle.
 */
export const SYSTEM_PLAN_SCHEMA = {
  quotas: [
    {
      key: "maxGroups",
      label: "Max Groups",
      type: "number" as const,
      unlimited: true,
    },
    {
      key: "maxCircles",
      label: "Max Circles",
      type: "number" as const,
      unlimited: true,
    },
  ],
  featureFlags: [] as Array<{
    key: string;
    label: string;
    type: "number" | "boolean";
    unlimited?: boolean;
  }>,
};
