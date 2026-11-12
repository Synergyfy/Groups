import { useParams } from "react-router-dom";
import Badge from "../../components/ui/Badge";
import type { BadgeVariant } from "../../components/ui/Badge";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import StatCard from "../../components/ui/StatCard";
import Table from "../../components/ui/Table";
import type { TableColumn } from "../../components/ui/Table";
import TipIcon from "../../components/ui/TipIcon";
import type { GroupActivity, GroupActivityKind } from "../../domain/types";
import { useGroup, useGroupActivity } from "../../store/selectors";
import { useDemoLoading } from "../../lib/demoDelay";
import { SkeletonCard, SkeletonRows } from "../../components/ui/Skeleton";
import AdminGroupTabsHeader, { AdminGroupMissingState } from "./AdminGroupTabsHeader";

const KIND_VARIANT: Record<GroupActivityKind, BadgeVariant> = {
  join: "success",
  leave: "warning",
  invite: "info",
  created: "gold",
  message: "default",
  update: "info",
  settings: "muted",
};

export default function AdminGroupActivityPage() {
  const { groupId } = useParams();
  const group = useGroup(groupId);
  const activity = useGroupActivity(groupId);
  const loading = useDemoLoading();

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <SkeletonCard />
        <SkeletonRows rows={6} />
      </div>
    );
  }

  if (!group) {
    return (
      <AdminGroupMissingState
        title="18 — Admin Group Activity"
        description="Administrative activity view for the selected group."
      />
    );
  }

  const joins = activity.filter((entry) => entry.kind === "join").length;
  const columns: TableColumn<GroupActivity>[] = [
    {
      key: "when",
      header: "When",
      render: (entry) => <span className="text-slate-300">{entry.at.slice(0, 16).replace("T", " ")}</span>,
    },
    {
      key: "actor",
      header: "Who",
      render: (entry) => <span className="font-semibold text-white">{entry.actorName}</span>,
    },
    {
      key: "kind",
      header: "Kind",
      render: (entry) => (
        <Badge variant={KIND_VARIANT[entry.kind] ?? "default"}>{entry.kind}</Badge>
      ),
    },
    {
      key: "message",
      header: "What happened",
      render: (entry) => <span className="text-slate-300">{entry.message}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <AdminGroupTabsHeader
        title="18 — Admin Group Activity"
        subtitle={`${group.name} — the audit trail an administrator reads before deciding anything: who did what, when.`}
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Activity entries"
          value={activity.length.toLocaleString("en-GB")}
          hint="Recorded for this group"
          accent="gold"
        />
        <StatCard
          label="Joins"
          value={joins.toLocaleString("en-GB")}
          hint="Membership changes"
          accent="success"
        />
        <StatCard
          label="Source"
          value={group.source === "automatic" ? "Automatic" : "User created"}
          hint={group.source === "automatic" ? "System created and monitored" : "Business owned"}
          accent="info"
        />
        <StatCard
          label="Status"
          value={group.status}
          hint="Group status, not stage"
          accent="warning"
        />
      </div>

      <Card data-tour="list">
        <CardBody className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <CardTitle>Activity log</CardTitle>
              <TipIcon text="Read-only: entries are added automatically and cannot be edited or deleted here." />
            </div>
          </div>
          <Table
            columns={columns}
            rows={activity}
            rowKey={(entry) => entry.id}
            emptyMessage="No activity has been recorded for this group yet."
          />
          <p className="text-[11px] leading-relaxed text-slate-500">
            Status and stage are never written to this log — activity records events, not states.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
