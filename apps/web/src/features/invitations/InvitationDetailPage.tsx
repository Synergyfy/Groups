import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  Check,
  CircleDashed,
  Inbox,
  Mail,
  RefreshCw,
  Send,
  ShieldQuestion,
  X,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import type { BadgeVariant } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import LinkButton from "../../components/ui/LinkButton";
import SectionHeader from "../../components/ui/SectionHeader";
import { Skeleton } from "../../components/ui/Skeleton";
import Toast from "../../components/ui/Toast";
import { errorMessage } from "../../app/api";
import {
  businessApi,
  useBusinessData,
} from "../../business/BusinessDataProvider";
import type { InvitationDetailResponse } from "../../business/businessApi";

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  pending: "warning",
  accepted: "success",
  declined: "danger",
  cancelled: "muted",
};

export default function InvitationDetailPage() {
  const { invitationId } = useParams();
  const navigate = useNavigate();
  const { profile, refresh } = useBusinessData();
  const actorId = profile?.business.id ?? "";

  const [detailState, setDetailState] = useState<{
    id: string;
    detail?: InvitationDetailResponse;
    error?: string;
  } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!invitationId) return;
    let alive = true;
    void businessApi
      .invitation(invitationId)
      .then((result) => {
        if (alive) setDetailState({ id: invitationId, detail: result });
      })
      .catch((cause) => {
        if (alive)
          setDetailState({ id: invitationId, error: errorMessage(cause) });
      });
    return () => {
      alive = false;
    };
  }, [invitationId]);

  const current = invitationId && detailState?.id === invitationId ? detailState : null;
  const detail = current?.detail ?? null;
  const loadError = current?.error ?? null;
  const loading = !current;

  const run = async (key: string, action: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    setFeedback(null);
    try {
      await action();
    } catch (cause) {
      setFeedback(errorMessage(cause));
    } finally {
      setBusy(null);
    }
  };

  const invitee = detail?.invitee;
  const inviter = detail?.inviter;
  const isInvitee =
    Boolean(
      detail?.canRespond && detail?.invitation.kind === "invite",
    ) || Boolean(invitee && invitee.id === actorId);
  const isInviter = Boolean(inviter && inviter.id === actorId);
  const isPending = detail?.invitation.status === "pending";

  const accept = async () => {
    if (!detail) return;
    await businessApi.respondInvitation(detail.invitation.id, true);
    await refresh();
    const target = detail.group
      ? `/business/groups/${detail.group.id}`
      : detail.circle
        ? `/business/circles/${detail.circle.id}`
        : null;
    setFeedback("Invitation accepted");
    if (target) navigate(target);
  };

  const decline = async () => {
    if (!detail) return;
    await businessApi.respondInvitation(detail.invitation.id, false);
    await refresh();
    const next = await businessApi.invitation(detail.invitation.id);
    setDetailState({ id: detail.invitation.id, detail: next });
    setFeedback("Invitation declined");
  };

  const cancel = async () => {
    if (!detail) return;
    await businessApi.cancelInvitation(detail.invitation.id);
    await refresh();
    const next = await businessApi.invitation(detail.invitation.id);
    setDetailState({ id: detail.invitation.id, detail: next });
    setFeedback("Invitation cancelled");
  };

  const resend = async () => {
    if (!detail) return;
    const result = await businessApi.resendInvitation(detail.invitation.id);
    setFeedback(
      result.resent ? "Invitation re-sent" : "This invitation could not be re-sent"
    );
  };

  const targetTitle = useMemo(() => {
    if (detail?.group) return detail.group.name;
    if (detail?.circle) return detail.circle.config.name;
    return "Group invitation";
  }, [detail]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <SectionHeader title="Invitation" subtitle="Loading invitation details…" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (loadError || !detail) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState
          title="Invitation not found"
          description={
            loadError ??
            "This invitation link is not valid, or the invitation no longer exists."
          }
          icon={<ShieldQuestion className="size-6" />}
          action={
            <LinkButton to="/business/invitations" variant="outline" size="sm">
              Back to invitations
            </LinkButton>
          }
        />
      </div>
    );
  }

  const { invitation, group, circle } = detail;
  const groupReviewable = Boolean(group) && invitation.kind === "invite";

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="Invitation"
        subtitle="Everything recorded for this invitation, and the actions available to you."
        back="/business/invitations"
        backLabel="Invitations"
      />

      <Card>
        <CardBody className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{targetTitle}</CardTitle>
                {group && <Badge variant="info">{group.type}</Badge>}
                {circle && <Badge variant="info">{circle.type}</Badge>}
              </div>
              <p className="mt-1 text-[11px] capitalize text-slate-500">
                {invitation.kind === "request" ? "Join request" : "Invitation"} ·{" "}
                {invitation.direction} · {targetTitle}
              </p>
            </div>
            <Badge variant={STATUS_VARIANTS[invitation.status] ?? "default"}>
              {invitation.status}
            </Badge>
          </div>

          <dl className="grid gap-2 text-xs sm:grid-cols-2">
            <InfoRow
              label="Invited by"
              value={
                inviter
                  ? `${inviter.name}${inviter.city ? ` · ${inviter.city}` : ""}`
                  : invitation.invitedByName
              }
            />
            <InfoRow
              label="Sent to"
              value={
                invitee
                  ? `${invitee.name}${invitee.category ? ` · ${invitee.category}` : ""}`
                  : invitation.inviteeName
              }
            />
            <InfoRow label="Their email" value={invitation.inviteeEmail ?? invitee?.email ?? "—"} />
            <InfoRow label="Sent" value={invitation.createdAt.slice(0, 10)} />
            {invitation.respondedAt && (
              <InfoRow
                label="Responded"
                value={invitation.respondedAt.slice(0, 10)}
              />
            )}
            <InfoRow label="Your role here" value={detail.responderRole} />
          </dl>
        </CardBody>
      </Card>

      {group && (
        <Card>
          <CardBody className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-gold-400" />
              <CardTitle>Group</CardTitle>
            </div>
            <p className="text-sm leading-relaxed text-slate-300">{group.purpose}</p>
            <dl className="grid gap-2 text-xs sm:grid-cols-2">
              <InfoRow label="Owner" value={group.ownerName} />
              <InfoRow label="Access" value={group.accessType} />
              <InfoRow label="Members" value={String(group.memberIds.length)} />
              <InfoRow label="Status" value={group.status} />
            </dl>
            <div>
              <LinkButton
                to={`/business/groups/${group.id}`}
                variant="outline"
                size="sm"
                state={{ from: "/business/invitations", fromLabel: "Invitations" }}
              >
                View group <ArrowRight className="size-3.5" />
              </LinkButton>
            </div>
          </CardBody>
        </Card>
      )}

      {circle && (
        <Card>
          <CardBody className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <CircleDashed className="size-4 text-gold-400" />
              <CardTitle>Circle</CardTitle>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">
              {circle.config.description}
            </p>
            <dl className="grid gap-2 text-xs sm:grid-cols-2">
              <InfoRow label="Type" value={circle.type} />
              <InfoRow label="Duration" value={`${circle.config.duration} days`} />
              <InfoRow label="Members" value={String(circle.memberIds.length)} />
              <InfoRow label="Visibility" value={circle.config.visibility} />
            </dl>
            <div>
              <LinkButton to={`/business/circles/${circle.id}`} variant="outline" size="sm">
                Open circle <ArrowRight className="size-3.5" />
              </LinkButton>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="size-4 text-gold-400" />
            <CardTitle>Available actions</CardTitle>
          </div>

          {!isPending ? (
            <p className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5 text-xs text-slate-400">
              <BadgeCheck className="size-4 shrink-0 text-slate-500" />
              This invitation was {invitation.status}
              {invitation.respondedAt
                ? ` on ${invitation.respondedAt.slice(0, 10)}`
                : ""}
              . Nothing further is needed.
            </p>
          ) : isInvitee && detail.canRespond ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs leading-relaxed text-slate-400">
                This invitation is addressed to you. Accepting adds you to the{" "}
                {circle ? "circle" : "group"} straight away; declining closes the
                invitation.
              </p>
              <div className="flex flex-wrap gap-2">
                {groupReviewable ? (
                  <LinkButton
                    to={`/business/invitations/${invitation.id}/review`}
                    variant="primary"
                    size="sm"
                  >
                    <Check className="size-4" /> Review &amp; accept
                  </LinkButton>
                ) : (
                  <Button
                    size="sm"
                    disabled={busy === "accept"}
                    onClick={() => run("accept", accept)}
                  >
                    <Check className="size-4" />
                    {busy === "accept" ? "Accepting…" : "Accept invitation"}
                  </Button>
                )}
                <Button
                  variant="danger"
                  size="sm"
                  disabled={busy === "decline"}
                  onClick={() => run("decline", decline)}
                >
                  <X className="size-4" />
                  {busy === "decline" ? "Declining…" : "Decline"}
                </Button>
              </div>
            </div>
          ) : isInviter ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs leading-relaxed text-slate-400">
                You sent this invitation to{" "}
                <span className="font-semibold text-white">{invitation.inviteeName}</span>
                . You can re-send it or cancel it while it is still pending.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy === "resend"}
                  onClick={() => run("resend", resend)}
                >
                  <RefreshCw className="size-4" />
                  {busy === "resend" ? "Re-sending…" : "Re-send invitation"}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={busy === "cancel"}
                  onClick={() => run("cancel", cancel)}
                >
                  <X className="size-4" />
                  {busy === "cancel" ? "Cancelling…" : "Cancel invitation"}
                </Button>
              </div>
            </div>
          ) : (
            <p className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5 text-xs text-slate-400">
              <Inbox className="size-4 shrink-0 text-slate-500" />
              This invitation is waiting on someone else, so there is nothing for you to
              do here.
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <Mail className="size-3.5 text-gold-400" />
          <span>
            Delivery: email{invitation.inviteePhone ? " and SMS" : ""} to{" "}
            {invitation.inviteeEmail ?? invitation.inviteePhone ?? invitation.inviteeName}
          </span>
          <Link
            to="/business/invitations"
            className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-gold-300 hover:text-gold-200"
          >
            <Send className="size-3.5" /> Back to inbox
          </Link>
        </CardBody>
      </Card>

      {feedback && <Toast message={feedback} onDismiss={() => setFeedback(null)} />}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-ink-950/50 px-3 py-2">
      <dt className="text-[11px] text-slate-500">{label}</dt>
      <dd className="text-right text-xs font-medium capitalize text-slate-200">
        {value}
      </dd>
    </div>
  );
}
