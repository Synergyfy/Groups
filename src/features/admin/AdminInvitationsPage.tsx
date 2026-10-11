import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Filter } from "lucide-react";
import Badge, { type BadgeVariant } from "../../components/ui/Badge";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import { FilterSelect } from "../../components/ui/FilterBar";
import SectionHeader from "../../components/ui/SectionHeader";
import { SkeletonCard, SkeletonRows } from "../../components/ui/Skeleton";
import StatCard from "../../components/ui/StatCard";
import Table from "../../components/ui/Table";
import type { TableColumn } from "../../components/ui/Table";
import type { Invitation } from "../../domain/types";
import { useDemoLoading } from "../../lib/demoDelay";
import { useAppState } from "../../store/selectors";

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  pending: "warning",
  accepted: "success",
  declined: "danger",
  cancelled: "muted",
};

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
  { value: "cancelled", label: "Cancelled" },
];

export default function AdminInvitationsPage() {
  const loading = useDemoLoading();
  const state = useAppState();
  const [status, setStatus] = useState("all");

  const groupName = (groupId: string) =>
    state.groups.find((group) => group.id === groupId)?.name ?? groupId;

  const filtered = state.invitations.filter(
    (invitation) => status === "all" || invitation.status === status
  );

  const counts = {
    pending: state.invitations.filter((invitation) => invitation.status === "pending").length,
    accepted: state.invitations.filter((invitation) => invitation.status === "accepted").length,
    declined: state.invitations.filter((invitation) => invitation.status === "declined").length,
    requests: state.invitations.filter((invitation) => invitation.kind === "request").length,
  };

  const columns: TableColumn<Invitation>[] = [
    {
      key: "group",
      header: "Group",
      render: (invitation) => (
        <Link
          to={`/admin/groups/${invitation.groupId}`}
          className="font-semibold text-white transition-colors hover:text-gold-300"
        >
          {groupName(invitation.groupId)}
        </Link>
      ),
    },
    {
      key: "invitee",
      header: "Business",
      render: (invitation) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-white">{invitation.inviteeName}</p>
          <p className="truncate text-[11px] text-slate-500">
            {invitation.inviteeEmail ?? invitation.inviteeId ?? "No contact on file"}
          </p>
        </div>
      ),
    },
    {
      key: "inviter",
      header: "Sent by",
      render: (invitation) => <span className="text-slate-300">{invitation.invitedByName}</span>,
    },
    {
      key: "kind",
      header: "Kind",
      render: (invitation) => (
        <Badge variant={invitation.kind === "request" ? "info" : "default"}>
          {invitation.kind === "request" ? "Join request" : "Invitation"}
        </Badge>
      ),
    },
    {
      key: "direction",
      header: "Direction",
      render: (invitation) => <span className="capitalize text-slate-300">{invitation.direction}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (invitation) => (
        <Badge variant={STATUS_VARIANTS[invitation.status] ?? "default"}>
          {invitation.status}
        </Badge>
      ),
    },
    {
      key: "created",
      header: "Raised",
      render: (invitation) => (
        <span className="text-slate-300">{invitation.createdAt.slice(0, 10)}</span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <SkeletonCard />
        <SkeletonRows rows={5} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="Invitations & Requests"
        back="/admin/groups"
        subtitle="Every pending group join and invitation request across the network, with the group each one belongs to — the administrator's view of the same inbox businesses use."
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Pending"
          value={counts.pending.toLocaleString("en-GB")}
          hint="Waiting for an answer"
          accent="warning"
        />
        <StatCard
          label="Accepted"
          value={counts.accepted.toLocaleString("en-GB")}
          hint="Joined the group"
          accent="success"
        />
        <StatCard
          label="Declined"
          value={counts.declined.toLocaleString("en-GB")}
          hint="Turned down"
          accent="danger"
        />
        <StatCard
          label="Join requests"
          value={counts.requests.toLocaleString("en-GB")}
          hint="Requests, not invitations"
          accent="info"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2" data-tour="filters">
        <div className="w-56">
          <FilterSelect
            label="Status"
            tip="Show only invitations with this status: pending, accepted, declined or cancelled."
            value={status}
            onChange={setStatus}
            options={STATUS_OPTIONS}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="size-3.5 text-gold-400" />
          <span className="text-[11px] text-slate-500">
            Showing {filtered.length} of {state.invitations.length} records
          </span>
        </div>
      </div>

      <Card data-tour="list">
        <CardBody className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Network invitation register</CardTitle>
            <Link
              to="/business/invitations"
              className="inline-flex items-center gap-1 text-xs font-medium text-gold-300 hover:text-gold-200"
            >
              Answer invitations as a business <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <Table
            columns={columns}
            rows={filtered}
            rowKey={(invitation) => invitation.id}
            emptyMessage="No invitations match this status."
          />
          <p className="text-[11px] leading-relaxed text-slate-500">
            Accepting, declining or cancelling is done by the group owner or the invited business —
            this screen reports the state, it never acts on someone else's behalf.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
