import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Copy,
  ExternalLink,
  Search,
  UserPlus,
} from "lucide-react";
import Badge, { type BadgeVariant } from "../../components/ui/Badge";
import Card, { CardBody } from "../../components/ui/Card";
import SectionHeader from "../../components/ui/SectionHeader";
import { SkeletonCard, SkeletonRows } from "../../components/ui/Skeleton";
import StatCard from "../../components/ui/StatCard";
import Table, { type TableColumn } from "../../components/ui/Table";
import Toast from "../../components/ui/Toast";
import type { Invitation } from "../../domain/types";
import { useDemoLoading } from "../../lib/demoDelay";
import { useAppState } from "../../store/selectors";
import { useAppStore } from "../../store/context";

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  pending: "warning",
  accepted: "success",
  declined: "danger",
  cancelled: "muted",
  expired: "muted",
  failed: "danger",
};

const ADMIN_ACTOR = { id: "admin", name: "Administrator" };

export default function AdminInvitationsPage() {
  const loading = useDemoLoading();
  const state = useAppState();
  const { dispatch } = useAppStore();

  const [activeTab, setActiveTab] = useState<"all" | "pending" | "accepted" | "expired" | "no-account">("all");
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const groupName = (groupId: string | undefined) =>
    (groupId && state.groups.find((group) => group.id === groupId)?.name) ?? groupId ?? "Unknown group";

  const circleName = (circleId: string | undefined) =>
    (circleId && state.circles.find((circle) => circle.id === circleId)?.config.name) ??
    circleId ??
    "Unknown circle";

  const approve = (invitation: Invitation) => {
    dispatch({
      type: "admin/invitation-respond",
      invitationId: invitation.id,
      accept: true,
      actor: ADMIN_ACTOR,
    });
    setFeedback(`Approved ${invitation.inviteeName}`);
  };

  const decline = (invitation: Invitation) => {
    dispatch({
      type: "admin/invitation-respond",
      invitationId: invitation.id,
      accept: false,
      actor: ADMIN_ACTOR,
    });
    setFeedback(`Declined ${invitation.inviteeName}`);
  };

  const copyLink = (invitationId: string) => {
    const url = `${window.location.origin}/invite/${invitationId}`;
    navigator.clipboard.writeText(url);
    setFeedback(`Copied invitation link: ${url}`);
  };

  const invitations = state.invitations;

  const counts = {
    total: invitations.length,
    pending: invitations.filter((inv) => inv.status === "pending").length,
    accepted: invitations.filter((inv) => inv.status === "accepted").length,
    declined: invitations.filter((inv) => inv.status === "declined").length,
    noAccount: invitations.filter(
      (inv) => !inv.inviteeId || !state.accounts.some((a) => a.id === inv.inviteeId)
    ).length,
  };

  const filtered = invitations.filter((invitation) => {
    // Tab filter
    if (activeTab === "pending" && invitation.status !== "pending") return false;
    if (activeTab === "accepted" && invitation.status !== "accepted") return false;
    if (activeTab === "expired" && invitation.status !== "cancelled" && invitation.status !== "declined") return false;
    if (activeTab === "no-account") {
      const hasAccount = invitation.inviteeId && state.accounts.some((a) => a.id === invitation.inviteeId);
      if (hasAccount) return false;
    }

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchInvitee = invitation.inviteeName.toLowerCase().includes(q);
      const matchEmail = (invitation.inviteeEmail ?? "").toLowerCase().includes(q);
      const matchInviter = invitation.invitedByName.toLowerCase().includes(q);
      const matchTarget = groupName(invitation.groupId).toLowerCase().includes(q);
      if (!matchInvitee && !matchEmail && !matchInviter && !matchTarget) return false;
    }

    return true;
  });

  const columns: TableColumn<Invitation>[] = [
    {
      key: "target",
      header: "Invited Group",
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
      header: "Invitee & Account Status",
      render: (invitation) => {
        const hasAccount =
          invitation.inviteeId && state.accounts.some((a) => a.id === invitation.inviteeId);
        return (
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white">{invitation.inviteeName}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[11px] text-slate-500 truncate">
                {invitation.inviteeEmail ?? invitation.inviteePhone ?? "No contact"}
              </span>
              <span
                className={`rounded px-1.5 py-0.2 text-[9px] font-semibold ${
                  hasAccount ? "bg-white/10 text-slate-300" : "bg-gold-500/15 text-gold-300"
                }`}
              >
                {hasAccount ? "Existing Account" : "Registers on Open"}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: "role",
      header: "Invited Role",
      render: (invitation) => (
        <Badge variant={invitation.inviteeRole === "consumer" ? "info" : "gold"}>
          {invitation.inviteeRole === "consumer" ? "Consumer" : "Business"}
        </Badge>
      ),
    },
    {
      key: "sentBy",
      header: "Sent By",
      render: (invitation) => <span className="text-slate-300 text-xs">{invitation.invitedByName}</span>,
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
      key: "actions",
      header: "Invite Link & Actions",
      align: "right",
      render: (invitation) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => copyLink(invitation.id)}
            title="Copy invitation link"
            className="inline-flex h-7 items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 text-[10px] text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <Copy className="size-3 text-gold-400" /> Link
          </button>
          <Link
            to={`/invite/${invitation.id}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Preview invitation page"
            className="inline-flex h-7 items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 text-[10px] text-slate-400 hover:text-white"
          >
            <ExternalLink className="size-3" /> Preview
          </Link>
          {invitation.status === "pending" && (
            <>
              <button
                type="button"
                onClick={() => approve(invitation)}
                className="inline-flex h-7 items-center gap-1 rounded-md bg-emerald-500/15 px-2 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/25"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => decline(invitation)}
                className="inline-flex h-7 items-center gap-1 rounded-md bg-rose-500/15 px-2 text-[10px] font-semibold text-rose-300 hover:bg-rose-500/25"
              >
                Decline
              </button>
            </>
          )}
        </div>
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
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Invitations & Requests"
        subtitle="Track invitations, invitation links, pending and accepted invitations, expired links and failed invitations. Support invited people who do not yet have an account."
        tip="Every invitation includes a self-contained public link enabling seamless registration and direct entry."
      />
      <p className="-mt-4 text-xs text-slate-500">Network invitation register — every invitation sent across all groups and circles.</p>

      {/* --- Stat Cards ------------------------------------------------ */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Total invitations"
          value={counts.total}
          hint="All recorded invitations"
          accent="gold"
        />
        <StatCard
          label="Pending response"
          value={counts.pending}
          hint="Waiting for user action"
          accent="warning"
        />
        <StatCard
          label="Accepted"
          value={counts.accepted}
          hint="Successfully joined"
          accent="success"
        />
        <StatCard
          label="New user invites"
          value={counts.noAccount}
          hint="Invited without prior account"
          accent="info"
        />
      </div>

      {/* --- Invitation-First Non-Account Support Card --------------------- */}
      <div className="flex items-start gap-3 rounded-xl border border-gold-500/30 bg-gold-500/10 p-4">
        <UserPlus className="mt-0.5 size-5 shrink-0 text-gold-400" />
        <div>
          <p className="text-xs font-semibold text-gold-300">
            Invitation-First Architecture for New Users
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
            When a business owner invites someone who does not have a Central Hub Solution account,
            the system delivers an invitation link (`/invite/:id`). The landing page explains the
            connection, preserves their invite context while they create a free account, and immediately
            returns them to accept and access their group.
          </p>
        </div>
      </div>

      {/* --- Tabs & Filter Controls --------------------------------------- */}
      <Card>
        <CardBody className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <TabBtn
                label="All Invitations"
                count={invitations.length}
                active={activeTab === "all"}
                onClick={() => setActiveTab("all")}
              />
              <TabBtn
                label="Pending"
                count={counts.pending}
                active={activeTab === "pending"}
                onClick={() => setActiveTab("pending")}
              />
              <TabBtn
                label="Accepted"
                count={counts.accepted}
                active={activeTab === "accepted"}
                onClick={() => setActiveTab("accepted")}
              />
              <TabBtn
                label="Declined / Expired"
                count={counts.declined}
                active={activeTab === "expired"}
                onClick={() => setActiveTab("expired")}
              />
              <TabBtn
                label="Without Prior Account"
                count={counts.noAccount}
                active={activeTab === "no-account"}
                onClick={() => setActiveTab("no-account")}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-3 size-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by invitee, email, or sender..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-lg border border-white/10 bg-ink-950/70 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-gold-500/50 focus:outline-none"
              />
            </div>
            <div className="text-xs text-slate-500">
              Showing {filtered.length} of {invitations.length} invitations
            </div>
          </div>

          <Table
            columns={columns}
            rows={filtered}
            rowKey={(inv) => inv.id}
            emptyMessage="No invitations match your selected tab or search criteria."
          />
        </CardBody>
      </Card>

      {feedback && <Toast message={feedback} onDismiss={() => setFeedback(null)} />}
    </div>
  );
}

function TabBtn({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-gold-500/15 text-gold-300 border border-gold-500/30"
          : "text-slate-400 hover:bg-white/5 hover:text-white"
      }`}
    >
      <span>{label}</span>
      <span
        className={`rounded-full px-1.5 py-0.2 text-[10px] ${
          active ? "bg-gold-500/20 text-gold-200" : "bg-white/10 text-slate-400"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
