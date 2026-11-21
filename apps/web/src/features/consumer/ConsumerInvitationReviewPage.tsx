import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleDollarSign,
  Info,
  ShieldQuestion,
  Users,
  X,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import { errorMessage } from "../../app/api";
import {
  consumerApi,
  type ConsumerInvitationDetail,
} from "../../consumer/consumerApi";
import { useConsumerData } from "../../consumer/ConsumerDataProvider";
import PaymentDialog, {
  type PaymentTarget,
} from "../payments/PaymentDialog";
import { paymentRequiredDetails } from "../payments/paymentsApi";

export default function ConsumerInvitationReviewPage() {
  const { invitationId = "" } = useParams();
  const navigate = useNavigate();
  const { refresh } = useConsumerData();

  const [invitation, setInvitation] = useState<ConsumerInvitationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<PaymentTarget | null>(null);

  const load = useCallback(async () => {
    try {
      setInvitation(await consumerApi.invitation(invitationId));
      setError(null);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [invitationId]);

  useEffect(() => {
    // Initial fetch; the async loader only updates state after the request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (invitationId) void load();
  }, [invitationId, load]);

  const respond = async (accept: boolean) => {
    if (!invitation) return;
    setBusy(true);
    setFeedback(null);
    try {
      await consumerApi.respondInvitation(invitation.id, accept);
      await refresh();
      navigate(
        accept
          ? invitation.circleId
            ? `/consumer/circles/${invitation.circleId}`
            : "/consumer/my-groups"
          : "/consumer/invitations",
        { replace: true },
      );
    } catch (cause) {
      const required = paymentRequiredDetails(cause);
      if (required && accept) {
        setPaymentTarget({
          kind: "CONTRIBUTION",
          groupId: required.groupId,
          groupName: invitation.group?.name ?? "Group",
          amountPounds: required.amountPounds,
          frequency: required.frequency,
          onPaid: async () => {
            await consumerApi.respondInvitation(invitation.id, true);
            await refresh();
            navigate("/consumer/my-groups", { replace: true });
          },
        });
        setPaymentOpen(true);
        return;
      }
      setFeedback(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-10 text-center text-sm text-slate-400">
        Loading invitation…
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-10 text-center">
        <ShieldQuestion className="mx-auto size-8 text-slate-500" />
        <p className="mt-3 text-sm font-semibold text-white">Invitation unavailable</p>
        <p className="mt-1 text-xs text-slate-400">{error || "This invitation could not be loaded."}</p>
        <Link
          to="/consumer/invitations"
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gold-500 px-3.5 py-2 text-xs font-bold text-ink-950"
        >
          <ArrowLeft className="size-3.5" /> Back to invitations
        </Link>
      </div>
    );
  }

  if (invitation.status !== "pending") {
    return (
      <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-10 text-center">
        <Info className="mx-auto size-8 text-slate-500" />
        <p className="mt-3 text-sm font-semibold text-white">
          This invitation is {invitation.status}
        </p>
        <p className="mt-1 text-xs text-slate-400">Nothing further is needed.</p>
        <Link
          to="/consumer/invitations"
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gold-500 px-3.5 py-2 text-xs font-bold text-ink-950"
        >
          <ArrowLeft className="size-3.5" /> Back to invitations
        </Link>
      </div>
    );
  }

  const group = invitation.group;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link
          to="/consumer/invitations"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white"
        >
          <ArrowLeft className="size-3.5" /> Invitations
        </Link>
        <Badge variant="warning">Pending</Badge>
      </div>

      <Card>
        <CardBody className="flex flex-col gap-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Invited by</p>
          <p className="text-sm font-semibold text-white">{invitation.invitedByName}</p>
          <p className="text-[11px] text-slate-500">
            Sent {invitation.createdAt.slice(0, 10)}
          </p>
        </CardBody>
      </Card>

      {group ? (
        <>
          <Card>
            <CardBody className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{group.name}</CardTitle>
                <Badge variant="info">{group.type}</Badge>
                <Badge variant="success">{group.status}</Badge>
              </div>
              <p className="text-sm leading-relaxed text-slate-300">
                {group.purpose || group.description || "No description provided."}
              </p>
              <div className="grid gap-2 text-xs sm:grid-cols-2">
                <InfoRow label="Owner" value={group.ownerName || "Group owner"} />
                <InfoRow label="Access" value={group.accessType} />
                {group.city && <InfoRow label="Location" value={group.city} />}
                <InfoRow
                  label="Members"
                  value={String(group.memberCount ?? 0)}
                />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <CircleDollarSign
                  className={`size-4 ${group.pricing === "paid" ? "text-warning-400" : "text-success-400"}`}
                />
                <CardTitle>What it costs</CardTitle>
              </div>
              <p
                className={`text-xl font-bold ${group.pricing === "paid" ? "text-warning-300" : "text-success-300"}`}
              >
                {group.pricing === "paid"
                  ? `£${group.contribution ?? 0} ${group.contributionFrequency ?? "once"}`
                  : "Free to join"}
              </p>
              <p className="text-xs leading-relaxed text-slate-400">
                {group.pricing === "paid"
                  ? "The group contribution is collected through MCOM Pay when you confirm."
                  : "There is no contribution to pay to belong to this group."}
              </p>
            </CardBody>
          </Card>
        </>
      ) : (
        <Card>
          <CardBody className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-gold-400" />
              <CardTitle>{invitation.circleName || "Circle invitation"}</CardTitle>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">
              You have been invited to join this circle
              {invitation.circleBusinessName
                ? ` from ${invitation.circleBusinessName}`
                : ""}
              . Accepting adds you to the circle member list.
            </p>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <ShieldQuestion className="size-4 text-gold-400" />
            <CardTitle>Confirm you want to join</CardTitle>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-ink-950/60 p-3">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-0.5 size-4 shrink-0 cursor-pointer accent-gold-500"
            />
            <span className="text-xs leading-relaxed text-slate-300">
              I want to join {group?.name || invitation.circleName || "this community"}.
            </span>
          </label>

          {feedback && (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {feedback}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!confirmed || busy}
              onClick={() => void respond(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-gold-500 px-4 py-2 text-xs font-bold text-ink-950 hover:bg-gold-400 disabled:opacity-40"
            >
              <Check className="size-3.5" /> {busy ? "Joining…" : "Yes, join"}
              {!busy && <ArrowRight className="size-3.5" />}
            </button>
            <Link
              to="/consumer/invitations"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-white/10"
            >
              No, go back
            </Link>
            <button
              type="button"
              disabled={busy}
              onClick={() => void respond(false)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 disabled:opacity-40"
            >
              <X className="size-3.5" /> Decline
            </button>
          </div>
        </CardBody>
      </Card>

      <PaymentDialog
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        target={paymentTarget}
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-ink-950/50 px-3 py-2">
      <dt className="text-[11px] text-slate-500">{label}</dt>
      <dd className="text-right text-xs font-medium capitalize text-slate-200">{value}</dd>
    </div>
  );
}
