import type { AdminConfig } from "../domain/types";

export const DEFAULT_ADMIN_CONFIG: AdminConfig = {
  automaticGrouping: {
    enabled: true,
    threshold: 12,
    method: "Joining order",
    scope: "National network",
    allowCombine: false,
  },
  groupTypes: [
    { type: "Marketing", enabled: true, allowCreate: true, allowJoin: true },
    { type: "Advertising", enabled: true, allowCreate: true, allowJoin: true },
    { type: "B2B", enabled: true, allowCreate: true, allowJoin: true },
    { type: "Partner", enabled: true, allowCreate: true, allowJoin: true },
    { type: "Affiliate", enabled: true, allowCreate: true, allowJoin: true },
    { type: "Event / Expo", enabled: true, allowCreate: true, allowJoin: true },
    { type: "Other", enabled: true, allowCreate: true, allowJoin: true },
  ],
  stageLabels: ["Stage 1", "Stage 2", "Stage 3"],
  paymentRules: {
    allowPaid: true,
    minAmount: 5,
    maxAmount: 500,
    presets: [10, 25, 50, 100],
    allowCustom: true,
  },
};
