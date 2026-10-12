import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  CircleDollarSign,
  Info,
  ShieldQuestion,
  Users,
  X,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import type { BadgeVariant } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import LinkButton from "../../components/ui/LinkButton";
import SectionHeader from "../../components/ui/SectionHeader";
import { CURRENT_BUSINESS } from "../../data/businessData";
import type { InteractionLevel } from "../../domain/types";
import { useAppStore } from "../../store/context";
import { useGroup, useInvitation, useProgrammes } from "../../store/selectors";
import { contributionLabel, memberCountOf } from "../groups/groupUtils";
import { getParticipantIdentity } from "../participant/participantIdentity";

const ACCESS_LABELS: Record<string, string> = {
  open: "Open — anyone can join",
  request: "Request — owner approval needed",
  eligibility: "Eligibility — membership conditions apply",
  invitation: "Invitation only — owner must invite",
};

const INTERACTION_LABELS: Record<InteractionLevel, string> = {
  read: "Read only — members can read and browse",
  message: "Message — members can post and reply",
  collaborate: "Collaborate — members can post, reply and co-edit",
};

const VISIBILITY_LABELS: Record<string, string> = {
  directory: "Listed in the group directory",
  members: "Members only — not listed publicly",
};

type Scope = "business" | "participant";

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  pending: "warning",
  accepted: "success",
  declined: "danger",
  cancelled: "muted",
};

export default function InvitationReviewPage() {
  useEffect(() => {
    document.title = "Groups & Circles | Review invitation";
  }, []);

  const { invitationId } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const scope: Scope = pathname.startsWith("/participant") ? "participant" : "business";
  const base = scope === "participant" ? "/participant" : "/business";
  const invitationsPath = `${base}/invitations`;

  const { dispatch } = useAppStore();
  const invitation = useInvitation(invitationId);
  const group = useGroup(invitation?.groupId);
  const programmes = useProgrammes();

  const actor =
    scope === "participant"
      ? getParticipantIdentity()
      : { id: CURRENT_BUSINESS.id, name: CURRENT_BUSINESS.businessName };

  const [confirmed, setConfirmed] = useState(false);
  const [joined, setJoined] = useState(false);

  // --- Guard states -------------------------------------------------------
  const backAction = (
    <LinkButton to={invitationsPath} variant="outline" size="sm">
      Back to invitations
    </LinkButton>
  );

  if (!invitation) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState
          title="Invitation not found"
          description="This invitation link is not valid, or it has been removed from the demo store."
          icon={<ShieldQuestion className="size-6" />}
          action={backAction}
        />
      </div>
    );
  }

  if (invitation.circleId) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState
          title="This invitation is for a circle"
          description="Circle invitations are confirmed directly from the invitations list — they do not use this review step."
          icon={<Info className="size-6" />}
          action={backAction}
        />
      </div>
    );
  }

  const isInvitee = invitation.inviteeId === actor.id;

  if (!isInvitee) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState
          title="This invitation is not addressed to you"
          description={`It was sent to ${invitation.inviteeName}. Open the invitation from your own account to review and join.`}
          icon={<ShieldQuestion className="size-6" />}
          action={backAction}
        />
      </div>
    );
  }

  if (invitation.status !== "pending" && !joined) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState
          title={
            invitation.status === "accepted"
              ? "You already joined this group"
              : "You already responded to this invitation"
          }
          description={`This invitation was marked ${invitation.status} on ${
            invitation.respondedAt?.slice(0, 10) ?? "an earlier date"
          }. Nothing further is needed.`}
          icon={<BadgeCheck className="size-6" />}
          action={backAction}
        />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState
          title="This group is no longer available"
          description="The group behind this invitation has been removed, so it cannot be joined."
          icon={<Building2 className="size-6" />}
          action={backAction}
        />
      </div>
    );
  }

  // --- Joined confirmation ------------------------------------------------
  if (joined) {
    return (
      <div className="flex flex-col gap-4">
        <Card>
          <CardBody className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl border border-success-500/30 bg-success-500/10 text-success-400">
              <Check className="size-7" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white sm:text-xl">
                You have joined {group.name}
              </h1>
              <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-400 sm:text-sm">
                {group.pricing === "paid"
                  ? `Your membership is active. The group owner collects ${contributionLabel(
                      group
                    )} — no payment was taken on this screen.`
                  : "Your membership is active. This group is free to belong to."}
              </p>
            </div>
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              {scope === "business" && (
                <LinkButton
                  to={`/business/groups/${group.id}`}
                  variant="primary"
                  size="md"
                >
                  Open the group <ArrowRight className="size-4" />
                </LinkButton>
              )}
              <LinkButton to={invitationsPath} variant="outline" size="md">
                Back to invitations
              </LinkButton>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  // --- Pending: the explanation + confirmation step ------------------------
  const programme = programmes.find((entry) => entry.id === group.programmeId);
  const isPaid = group.pricing === "paid";
  const memberCount = memberCountOf(group);

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="Review before you join"
        subtitle="Read what joining this group involves. Nothing happens until you confirm below."
        back={invitationsPath}
        backLabel="Invitations"
      />

      {/* Who invited you */}
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">
              Invited by
            </p>
            <p className="mt-0.5 text-sm font-semibold text-white">
              {invitation.invitedByName}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Sent {invitation.createdAt.slice(0, 10)}
            </p>
          </div>
          <Badge variant={STATUS_VARIANTS[invitation.status] ?? "default"}>
            {invitation.status}
          </Badge>
        </CardBody>
      </Card>

      {/* About the group */}
      <Card>
        <CardBody className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{group.name}</CardTitle>
            <Badge variant="info">{group.type}</Badge>
            <Badge variant={group.status === "Suspended" ? "danger" : "success"}>
              {group.status}
            </Badge>
          </div>
          <p className="text-sm leading-relaxed text-slate-300">{group.purpose}</p>
          <dl className="grid gap-2 text-xs sm:grid-cols-2">
            <InfoRow label="Owner" value={group.ownerName} />
            <InfoRow
              label="Access"
              value={ACCESS_LABELS[group.accessType] ?? group.accessType}
            />
            {group.location?.city && (
              <InfoRow label="Location" value={group.location.city} />
            )}
            {group.stage && <InfoRow label="Stage" value={group.stage} />}
            {programme && <InfoRow label="Programme" value={programme.name} />}
          </dl>
        </CardBody>
      </Card>

      {/* What it costs */}
      <Card>
        <CardBody className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <CircleDollarSign
              className={`size-4 ${isPaid ? "text-warning-400" : "text-success-400"}`}
            />
            <CardTitle>What it costs</CardTitle>
          </div>
          <p
            className={`text-xl font-bold ${isPaid ? "text-warning-300" : "text-success-300"}`}
          >
            {isPaid ? contributionLabel(group) : "Free to join"}
          </p>
          {isPaid ? (
            <p className="text-xs leading-relaxed text-slate-400">
              This group charges a contribution. The amount above is collected by the
              group owner ({group.ownerName}) on the schedule shown — accepting this
              invitation does not take a payment, and you can leave the group at any
              time.
            </p>
          ) : (
            <p className="text-xs leading-relaxed text-slate-400">
              There is no contribution to pay to belong to this group. Accepting the
              invitation simply adds you to the member list.
            </p>
          )}
        </CardBody>
      </Card>

      {/* Membership and activity */}
      <Card>
        <CardBody className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-gold-400" />
            <CardTitle>Membership and activity</CardTitle>
          </div>
          <dl className="grid gap-2 text-xs sm:grid-cols-2">
            <InfoRow
              label="Members now"
              value={group.requiredSize ? `${memberCount} of ${group.requiredSize}` : String(memberCount)}
            />
            <InfoRow
              label="Visibility"
              value={VISIBILITY_LABELS[group.visibility ?? "directory"]}
            />
            <InfoRow
              label="What members can do"
              value={INTERACTION_LABELS[group.interactionLevel ?? "message"]}
            />
            <InfoRow
              label="How joining works"
              value={ACCESS_LABELS[group.accessType] ?? group.accessType}
            />
          </dl>
        </CardBody>
      </Card>

      {/* What happens when you join */}
      <Card>
        <CardBody className="flex flex-col gap-3">
          <CardTitle>What happens when you confirm</CardTitle>
          <ul className="flex flex-col gap-2 text-xs leading-relaxed text-slate-400">
            <Bullet>
              <span className="text-white">{actor.name}</span> is added to the member list
              of {group.name}.
            </Bullet>
            <Bullet>
              The group owner and existing members can see that you joined, and the join
              is recorded in the group activity trail.
            </Bullet>
            <Bullet>
              You can see the group in your groups list
              {scope === "business" ? " and open its pages" : ""} straight away.
            </Bullet>
            <Bullet>
              {isPaid
                ? `The contribution of ${contributionLabel(group)} is arranged with the group owner — it is not charged by this screen.`
                : "There is nothing to pay and no further approval step."}
            </Bullet>
            <Bullet>
              You can leave the group later; leaving removes you from the member list.
            </Bullet>
          </ul>
        </CardBody>
      </Card>

      {/* Confirmation */}
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
              I have read what this group involves — including that it is{" "}
              <span className="font-semibold text-white">
                {isPaid ? `paid (${contributionLabel(group)})` : "free to join"}
              </span>{" "}
              — and I want to join {group.name}.
            </span>
          </label>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="md"
              disabled={!confirmed}
              onClick={() => {
                dispatch({
                  type: "invitation/respond",
                  invitationId: invitation.id,
                  accept: true,
                  responder: { id: actor.id, name: actor.name },
                });
                setJoined(true);
              }}
            >
              <Check className="size-4" /> Yes, join this group
            </Button>
            <LinkButton to={invitationsPath} variant="outline" size="md">
              No, go back
            </LinkButton>
            <Button
              variant="danger"
              size="md"
              onClick={() => {
                dispatch({
                  type: "invitation/respond",
                  invitationId: invitation.id,
                  accept: false,
                  responder: { id: actor.id, name: actor.name },
                });
                navigate(invitationsPath);
              }}
            >
              <X className="size-4" /> Decline invitation
            </Button>
          </div>

          {!confirmed && (
            <p className="text-[11px] text-slate-500">
              Tick the box above to enable the join button.
            </p>
          )}
        </CardBody>
      </Card>
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

function Bullet({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gold-500/60" />
      <span>{children}</span>
    </li>
  );
}
