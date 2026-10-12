import Badge from "../../components/ui/Badge";
import type { BadgeVariant } from "../../components/ui/Badge";
import type { Group, GroupSource, GroupStatus } from "../../domain/types";

const STATUS_VARIANTS: Record<GroupStatus, BadgeVariant> = {
  Active: "success",
  Recruiting: "info",
  "Pending Review": "warning",
  Suspended: "danger",
  Closed: "muted",
};

const SOURCE_LABELS: Record<GroupSource, string> = {
  automatic: "Automatic",
  "user-created": "User created",
};

export function GroupStatusBadge({ status }: { status: GroupStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{status}</Badge>;
}

export function GroupSourceBadge({ source }: { source: GroupSource }) {
  return (
    <Badge variant={source === "automatic" ? "info" : "gold"}>
      {SOURCE_LABELS[source]}
    </Badge>
  );
}

export function GroupTypeBadge({ type }: { type: Group["type"] }) {
  return <Badge variant="default">{type}</Badge>;
}
