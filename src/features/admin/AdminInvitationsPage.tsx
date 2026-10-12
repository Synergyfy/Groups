import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Filter, XCircle } from "lucide-react";
import Badge, { type BadgeVariant } from "../../components/ui/Badge";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import { FilterSelect } from "../../components/ui/FilterBar";
import SectionHeader from "../../components/ui/SectionHeader";
import { SkeletonCard, SkeletonRows } from "../../components/ui/Skeleton";
import StatCard from "../../components/ui/StatCard";
import Table from "../../components/ui/Table";
import TipIcon from "../../components/ui/TipIcon";
import Toast from "../../components/ui/Toast";
import type { TableColumn } from "../../components/ui/Table";
import type { Invitation } from "../../domain/types";
import { useDemoLoading } from "../../lib/demoDelay";
import { useAppState } from "../../store/selectors";
import { useAppStore } from "../../store/context";

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

const ADMIN_ACTOR = { id: "admin", name: "Administrator" };

export default function AdminInvitationsPage() {
  const loading = useDemoLoading();
  const state = useAppState();
  const { dispatch } = useAppStore();
  const [status, setStatus] = useState("all");
  const [feedback, setFeedback] = useState<string | null>(null);

  const groupName = (groupId: string | undefined) =>
    (groupId && state.groups.find((group) => group.id === groupId)?.name) ?? groupId ?? "Unknown group";

  const circleName = (circleId: string | undefined) =>
    (circleId && state.circles.find((circle) => circle.id === circleId)?.config.name) ??
    circleId ??
    "Unknown circle";

  const filtered = state.invitations.filter(
    (invitation) => status === "all" || invitation.status === status
  );

  const counts = {
    pending: state.invitations.filter((invitation) => invitation.status === "pending").length,
    accepted: state.invitations.filter((invitation) => invitation.status === "accepted").length,
    declined: state.invitations.filter((invitation) => invitation.status === "declined").length,
    requests: state.invitations.filter((invitation) => invitation.kind === "request").length,
  };

  const approve = (invitation: Invitation) => {
    dispatch({ type: "admin/invitation-respond", invitationId: invitation.id, accept: true, actor: ADMIN_ACTOR });
    setFeedback(`Approved ${invitation.inviteeName}`);
  };
  const decline = (invitation: Invitation) => {
    dispatch({ type: "admin/invitation-respond", invitationId: invitation.id, accept: false, actor: ADMIN_ACTOR });
    setFeedback(`Declined ${invitation.inviteeName}`);
  };

  const columns: TableColumn<Invitation>[] = [
    {
      key: "group",
      header: "Group / Circle",
      render: (invitation) =>
        invitation.circleId ? (
          <span className="inline-flex items-center gap-1.5 font-semibold text-white">
            <Badge variant="info">Circle</Badge>
            {circleName(invitation.circleId)}
          </span>
        ) : (
          <Link
            to={`/admin/groups/${invitation.groupId ?? ""}`}
            className="font-semibold text-white transition-colors hover:text-gold-300"
          >
            {groupName(invitation.groupId)}
          </Link>
        ),
    },
    {
      key: "invitee",
      header: "Invitee",
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
    {
      key: "actions",
      header: "Actions",
      render: (invitation) =>
        invitation.status === "pending" ? (
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => approve(invitation)}
              className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md bg-emerald-500/15 px-2 text-[10px] font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/25"
            >
              <CheckCircle2 className="size-3" /> Approve
            </button>
            <button
              type="button"
              onClick={() => decline(invitation)}
              className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md bg-danger-500/15 px-2 text-[10px] font-semibold text-danger-300 transition-colors hover:bg-danger-500/25"
            >
              <XCircle className="size-3" /> Decline
            </button>
          </div>
        ) : (
          <span className="text-[11px] text-slate-600">—</span>
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
        subtitle="Every invitation and join request across the platform. Approve or decline any pending item as an administrator."
        tip="The status filter only changes the table — the four counts above always cover the whole platform."
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Pending" value={counts.pending.toLocaleString("en-GB")} hint="Waiting for an answer" accent="warning" />
        <StatCard label="Accepted" value={counts.accepted.toLocaleString("en-GB")} hint="Joined the group" accent="success" />
        <StatCard label="Declined" value={counts.declined.toLocaleString("en-GB")} hint="Turned down" accent="danger" />
        <StatCard label="Join requests" value={counts.requests.toLocaleString("en-GB")} hint="Requests, not invitations" accent="info" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2" data-tour="filters">
        <div className="w-56">
          <FilterSelect
            label="Status"
            tip="Show only invitations with this status."
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
            <div className="flex items-center gap-1.5">
              <CardTitle>Network invitation register</CardTitle>
              <TipIcon text="Approve and Decline only appear while an item is pending; answered items cannot be changed here." />
            </div>
          </div>
          <Table
            columns={columns}
            rows={filtered}
            rowKey={(invitation) => invitation.id}
            emptyMessage="No invitations match this status."
          />
          <p className="text-[11px] leading-relaxed text-slate-500">
            The administrator can approve or decline any pending invitation. Actions are recorded in the audit log.
          </p>
        </CardBody>
      </Card>

      {feedback && <Toast message={feedback} onDismiss={() => setFeedback(null)} />}
    </div>
  );
}
