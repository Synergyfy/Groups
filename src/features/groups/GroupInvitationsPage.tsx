import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Check, ChevronLeft, Mail, RotateCcw, Search, Send, UserMinus, X } from "lucide-react";
import Badge from "../../components/ui/Badge";
import type { BadgeVariant } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import FieldHint from "../../components/ui/FieldHint";
import SectionHeader from "../../components/ui/SectionHeader";
import ShareLink from "../../components/ui/ShareLink";
import Table from "../../components/ui/Table";
import type { TableColumn } from "../../components/ui/Table";
import TipIcon from "../../components/ui/TipIcon";
import Toast from "../../components/ui/Toast";
import { CURRENT_BUSINESS, DIRECTORY } from "../../data/businessData";
import { useAppStore } from "../../store/context";
import { useGroup, useGroupInvitations } from "../../store/selectors";
import { useDemoLoading } from "../../lib/demoDelay";
import { SkeletonCard, SkeletonRows } from "../../components/ui/Skeleton";
import type { Invitation, InvitationStatus } from "../../domain/types";
import GroupTabsHeader, { GroupMissingState } from "./GroupTabsHeader";

const ACTOR_ID = CURRENT_BUSINESS.id;

const STATUS_VARIANTS: Record<InvitationStatus, BadgeVariant> = {
  pending: "warning",
  accepted: "success",
  declined: "danger",
  cancelled: "muted",
};

const DIRECTORY_INDEX = new Map(DIRECTORY.map((entry) => [entry.id, entry]));

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part.slice(0, 1))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function GroupInvitationsPage() {
  const { groupId } = useParams();
  const group = useGroup(groupId);
  const invitations = useGroupInvitations(groupId);
  const { dispatch } = useAppStore();

  const [search, setSearch] = useState("");
  const [email, setEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [phase, setPhase] = useState<"select" | "review">("select");
  const [feedback, setFeedback] = useState<string | null>(null);

  const isOwner = group?.ownerId === ACTOR_ID;
  const actor = { id: ACTOR_ID, name: CURRENT_BUSINESS.businessName };

  const pendingInviteeIds = useMemo(
    () =>
      new Set(
        invitations
          .filter((entry) => entry.status === "pending" && entry.kind === "invite")
          .map((entry) => entry.inviteeId)
          .filter((id): id is string => Boolean(id))
      ),
    [invitations]
  );

  const candidates = useMemo(() => {
    const term = search.trim().toLowerCase();
    const members = new Set(group?.memberIds ?? []);
    return DIRECTORY.filter((entry) => {
      if (members.has(entry.id) || pendingInviteeIds.has(entry.id)) return false;
      if (!term) return true;
      return `${entry.name} ${entry.contactName} ${entry.city} ${entry.category}`
        .toLowerCase()
        .includes(term);
    }).slice(0, 6);
  }, [search, group, pendingInviteeIds]);

  const selectedEntries = useMemo(
    () =>
      selectedIds
        .map((id) => DIRECTORY_INDEX.get(id))
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
    [selectedIds]
  );

  const pendingInvites = invitations.filter(
    (entry) => entry.status === "pending" && entry.kind === "invite"
  );
  const pendingRequests = invitations.filter(
    (entry) => entry.status === "pending" && entry.kind === "request"
  );
  const acceptedCount = invitations.filter((entry) => entry.status === "accepted").length;

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
    return <GroupMissingState title="10 — Invite Members" />;
  }

  const toggleSelected = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]
    );
  };

  const sendSelected = () => {
    if (selectedEntries.length === 0) return;
    dispatch({
      type: "group/invite",
      groupId: group.id,
      entries: selectedEntries.map((entry) => ({
        inviteeId: entry.id,
        inviteeName: entry.name,
      })),
      actor,
    });
    setFeedback(
      `${selectedEntries.length} invitation${selectedEntries.length === 1 ? "" : "s"} sent from ${
        group.name
      }`
    );
    setSelectedIds([]);
    setPhase("select");
  };

  const inviteByEmail = () => {
    const trimmed = email.trim();
    if (!trimmed.includes("@")) {
      setFeedback("Enter a valid email address");
      return;
    }
    dispatch({
      type: "group/invite",
      groupId: group.id,
      entries: [
        {
          inviteeName: contactName.trim() || trimmed,
          inviteeEmail: trimmed,
        },
      ],
      actor,
    });
    setFeedback(`Email invitation queued for ${trimmed}`);
    setEmail("");
    setContactName("");
  };

  const cancelInvitation = (invitation: Invitation) => {
    dispatch({
      type: "invitation/respond",
      invitationId: invitation.id,
      accept: false,
      responder: actor,
    });
    setFeedback(`Invitation to ${invitation.inviteeName} cancelled`);
  };

  const resendInvitation = (invitation: Invitation) => {
    dispatch({
      type: "group/invite",
      groupId: group.id,
      entries: [
        {
          ...(invitation.inviteeId ? { inviteeId: invitation.inviteeId } : {}),
          inviteeName: invitation.inviteeName,
          ...(invitation.inviteeEmail ? { inviteeEmail: invitation.inviteeEmail } : {}),
        },
      ],
      actor,
    });
    setFeedback(`Invitation to ${invitation.inviteeName} sent again`);
  };

  const respondToRequest = (invitation: Invitation, accept: boolean) => {
    dispatch({
      type: "invitation/respond",
      invitationId: invitation.id,
      accept,
      responder: actor,
    });
    setFeedback(
      accept
        ? `${invitation.inviteeName} added to ${group.name}`
        : `Request from ${invitation.inviteeName} rejected`
    );
  };

  const inviteColumns: TableColumn<Invitation>[] = [
    {
      key: "invitee",
      header: "Invitee",
      render: (row) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-ink-800 text-[10px] font-bold text-gold-400">
            {initialsOf(row.inviteeName)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white">{row.inviteeName}</p>
            <p className="truncate text-[11px] text-slate-500">
              {row.inviteeEmail ?? row.inviteeId ?? "—"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "channel",
      header: "Channel",
      render: (row) => <Badge variant={row.inviteeEmail ? "info" : "default"}>
        {row.inviteeEmail ? "Email" : "Directory"}
      </Badge>,
    },
    { key: "sent", header: "Sent", render: (row) => row.createdAt.slice(0, 10) },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge variant={STATUS_VARIANTS[row.status]}>{row.status}</Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) =>
        row.status === "pending" && row.kind === "invite" ? (
          <Button variant="ghost" size="sm" onClick={() => cancelInvitation(row)}>
            <UserMinus className="size-3.5" /> Cancel
          </Button>
        ) : row.status === "declined" || row.status === "cancelled" ? (
          <Button variant="outline" size="sm" onClick={() => resendInvitation(row)}>
            <RotateCcw className="size-3.5" /> Resend
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <GroupTabsHeader
        title="10 — Invite Members"
        subtitle="Owner invitation flow: multi-select businesses from the directory, review your selection, send, then track every invitation with resend or cancel."
      />

      {!isOwner && (
        <EmptyState
          title="Only the group owner can send invitations"
          description={`${group.ownerName} owns ${group.name}. You can watch the pending list below.`}
        />
      )}

      {isOwner && (
        <ShareLink
          url={`${window.location.origin}/business/groups/${group.id}`}
          label={`Invite link to ${group.name}`}
          hint="Share and copy this link — anyone who opens it can find the group and ask to join."
        />
      )}

      {isOwner && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card data-tour="directory-invite">
            <CardBody className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle>
                  Invite from the business directory
                  <TipIcon text="Filters the directory by business, contact, city or category." />
                </CardTitle>
                {phase === "review" && (
                  <Badge variant="gold">{selectedEntries.length} selected</Badge>
                )}
              </div>

              {phase === "select" && (
                <>
                  <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-950/60 px-3">
                    <Search className="size-4 shrink-0 text-slate-500" />
                    <input
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search by business, contact, city or category"
                      className="h-11 w-full bg-transparent text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    {candidates.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-white/15 p-4 text-center text-xs text-slate-500">
                        No eligible businesses match this search.
                      </p>
                    ) : (
                      candidates.map((entry) => {
                        const selected = selectedIds.includes(entry.id);
                        return (
                          <button
                            key={entry.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => toggleSelected(entry.id)}
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                              selected
                                ? "border-gold-500/50 bg-gold-500/10"
                                : "border-white/10 bg-ink-950/60 hover:border-white/20"
                            }`}
                          >
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-ink-800 text-xs font-bold text-gold-400">
                              {initialsOf(entry.name)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold text-white">
                                {entry.name}
                              </p>
                              <p className="truncate text-[11px] text-slate-500">
                                {entry.category} · {entry.city}
                              </p>
                            </div>
                            <span
                              className={`flex size-5 shrink-0 items-center justify-center rounded border ${
                                selected
                                  ? "border-gold-500 bg-gold-500 text-ink-950"
                                  : "border-white/25 text-transparent"
                              }`}
                            >
                              <Check className="size-3.5" />
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-3">
                    <span className="text-[11px] text-slate-500">
                      {selectedIds.length} selected — multi-select, then review before sending
                    </span>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={selectedIds.length === 0}
                      onClick={() => setPhase("review")}
                    >
                      Review invitations ({selectedIds.length})
                    </Button>
                  </div>
                </>
              )}

              {phase === "review" && (
                <>
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    Review step — check the businesses below before the invitations leave the
                    group. Nothing has been sent yet.
                  </p>
                  <div className="flex flex-col gap-2">
                    {selectedEntries.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-white/15 p-4 text-center text-xs text-slate-500">
                        No businesses selected — go back and pick at least one.
                      </p>
                    ) : (
                      selectedEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center gap-3 rounded-xl border border-white/10 bg-ink-950/60 p-3"
                        >
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-ink-800 text-xs font-bold text-gold-400">
                            {initialsOf(entry.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-white">
                              {entry.name}
                            </p>
                            <p className="truncate text-[11px] text-slate-500">
                              {entry.category} · {entry.city}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSelected(entry.id)}
                            title="Remove from this send"
                          >
                            <X className="size-3.5" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPhase("select")}
                    >
                      <ChevronLeft className="size-3.5" /> Back to search
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={selectedEntries.length === 0}
                      onClick={sendSelected}
                    >
                      <Send className="size-3.5" /> Send {selectedEntries.length} invitation
                      {selectedEntries.length === 1 ? "" : "s"}
                    </Button>
                  </div>
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="flex flex-col gap-3">
              <CardTitle>Invite by email</CardTitle>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-slate-400">Contact name</span>
                <FieldHint>Shown on the invitation so you can recognise who was invited.</FieldHint>
                <input
                  type="text"
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                  placeholder="e.g. Westside Events"
                  className="h-11 rounded-lg border border-white/10 bg-ink-800 px-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-gold-500/50 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-slate-400">Email address</span>
                <FieldHint>Where the invitation is sent — it must include an @.</FieldHint>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@company.example"
                  className="h-11 rounded-lg border border-white/10 bg-ink-800 px-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-gold-500/50 focus:outline-none"
                />
              </label>
              <Button variant="primary" size="sm" onClick={inviteByEmail}>
                <Mail className="size-4" /> Send email invitation
              </Button>
              <p className="text-[11px] leading-relaxed text-slate-500">
                Email invitations stay pending until the recipient responds. No message is actually
                delivered.
              </p>

              <div className="mt-2 rounded-xl border border-white/10 bg-ink-950/60 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wide text-slate-500">
                    Pending requests
                  </span>
                  <Badge variant={pendingRequests.length > 0 ? "warning" : "success"}>
                    {pendingRequests.length}
                  </Badge>
                </div>
                {pendingRequests.length === 0 ? (
                  <p className="mt-2 text-[11px] text-slate-500">No join requests waiting.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {pendingRequests.map((entry) => (
                      <li key={entry.id} className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-slate-300">
                          {entry.inviteeName}
                        </span>
                        <span className="flex shrink-0 gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => respondToRequest(entry, true)}
                          >
                            <Check className="size-3.5" />
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => respondToRequest(entry, false)}
                          >
                            <X className="size-3.5" />
                          </Button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      <SectionHeader
        title="Invitation status"
        subtitle={`${invitations.length} recorded · ${pendingInvites.length} waiting · ${acceptedCount} accepted. Cancel pending invitations or resend declined and cancelled ones.`}
      />
      <Table
        columns={inviteColumns}
        rows={invitations}
        rowKey={(row) => row.id}
        emptyMessage="No invitations have been sent yet."
      />

      {feedback && <Toast message={feedback} onDismiss={() => setFeedback(null)} />}
    </div>
  );
}
