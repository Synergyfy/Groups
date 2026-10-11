import { useParams } from "react-router-dom";
import Badge from "../../components/ui/Badge";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import StatCard from "../../components/ui/StatCard";
import Table from "../../components/ui/Table";
import type { TableColumn } from "../../components/ui/Table";
import { findDirectoryEntry } from "../../data/businessData";
import { useAppState, useGroup } from "../../store/selectors";
import { useDemoLoading } from "../../lib/demoDelay";
import { SkeletonCard, SkeletonRows } from "../../components/ui/Skeleton";
import { memberCountOf } from "../groups/groupUtils";
import AdminGroupTabsHeader, { AdminGroupMissingState } from "./AdminGroupTabsHeader";

interface MemberRow {
  id: string;
  name: string;
  contactName: string;
  category: string;
  city: string;
  role: "Owner" | "Member";
}

export default function AdminGroupMembersPage() {
  const { groupId } = useParams();
  const group = useGroup(groupId);
  const state = useAppState();
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
        title="17 — Admin Group Members"
        description="Full member register for the selected group, seen from the administrator's side."
      />
    );
  }

  const rows: MemberRow[] = group.memberIds.map((id) => {
    const entry = findDirectoryEntry(id);
    return {
      id,
      name: entry.name,
      contactName: entry.contactName,
      category: entry.category,
      city: entry.city,
      role: id === group.ownerId ? "Owner" : "Member",
    };
  });

  const cities = new Set(rows.map((row) => row.city).filter((city) => city !== "-")).size;
  const owners = rows.filter((row) => row.role === "Owner").length;
  const rule = state.adminConfig.automaticGrouping;

  const columns: TableColumn<MemberRow>[] = [
    {
      key: "name",
      header: "Member",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-ink-800 text-xs font-bold text-gold-400">
            {row.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white">{row.name}</p>
            <p className="truncate text-[11px] text-slate-500">{row.contactName}</p>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (row) => <span className="text-slate-300">{row.category}</span>,
    },
    {
      key: "city",
      header: "City",
      render: (row) => <span className="text-slate-300">{row.city}</span>,
    },
    {
      key: "role",
      header: "Role",
      render: (row) => (
        <Badge variant={row.role === "Owner" ? "gold" : "default"}>{row.role}</Badge>
      ),
    },
    {
      key: "joined",
      header: "Group since",
      render: () => <span className="text-slate-300">{group.createdAt.slice(0, 10)}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <AdminGroupTabsHeader
        title="17 — Admin Group Members"
        subtitle={`${group.name} — every seat in the group with category, city and role, counted from the demo store.`}
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Members"
          value={memberCountOf(group).toLocaleString("en-GB")}
          hint={group.name}
          accent="gold"
        />
        <StatCard
          label="Owners"
          value={owners.toLocaleString("en-GB")}
          hint="Owner controls apply to them"
          accent="info"
        />
        <StatCard
          label="Cities represented"
          value={cities.toLocaleString("en-GB")}
          hint="From member directory entries"
          accent="success"
        />
        <StatCard
          label={group.source === "automatic" ? "Threshold" : "Target size"}
          value={group.source === "automatic" ? rule.threshold : (group.requiredSize ?? "—")}
          hint={
            group.source === "automatic"
              ? `System split at ${rule.threshold} members`
              : "Set by the group owner"
          }
          accent="warning"
        />
      </div>

      <Card data-tour="list">
        <CardBody className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Member register</CardTitle>
          </div>
          <Table
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            emptyMessage="This group has no members yet."
          />
        </CardBody>
      </Card>
    </div>
  );
}
