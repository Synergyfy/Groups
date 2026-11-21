import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { ReactNode } from "react";
import {
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  Lock,
  MapPin,
  Send,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import CollapsibleCard from "../../components/ui/CollapsibleCard";
import EmptyState from "../../components/ui/EmptyState";
import LinkButton from "../../components/ui/LinkButton";
import Toast from "../../components/ui/Toast";
import { useAppState, useGroup, useGroupActivity, useGroupInvitations, selectGroupActivation } from "../../store/selectors";
import { useAppStore } from "../../store/context";
import { errorMessage } from "../../app/api";
import { ApiError } from "../../app/api";
import PaymentDialog, {
  type PaymentTarget,
} from "../payments/PaymentDialog";
import {
  businessApi,
  useOptionalBusinessData,
  type BusinessGroup,
  type BusinessMember,
} from "../../business/BusinessDataProvider";
import { SkeletonCard, SkeletonRows } from "../../components/ui/Skeleton";
import MemberSearch, { type MemberSearchItem } from "../../components/members/MemberSearch";
import MemberDetailModal from "../../components/members/MemberDetailModal";
import {
  GroupSourceBadge,
  GroupStatusBadge,
  GroupTypeBadge,
} from "./GroupBadges";
import { memberCountOf, contributionLabel } from "./groupUtils";
import { relativeTime } from "../../lib/time";
import GroupTabsHeader, { GroupMissingState } from "./GroupTabsHeader";
import GroupCircleView from "./GroupCircleView";

const ACCESS_LABELS: Record<string, string> = {
  open: "Open — anyone can join",
  request: "Request — owner approval needed",
  eligibility: "Eligibility — membership conditions apply",
  invitation: "Invitation only — owner must invite",
};

type GroupDetail = Awaited<ReturnType<typeof businessApi.group>>;

export default function GroupDetailsPage() {
  const { groupId } = useParams();
  const business = useOptionalBusinessData();
  const group = useGroup(groupId);
  const storedActivity = useGroupActivity(groupId);
  const invitations = useGroupInvitations(groupId);
  const state = useAppState();
  const { adminConfig } = state;
  const { dispatch } = useAppStore();
  const loading = false;
  const [feedback, setFeedback] = useState<string | null>(null);
  const [memberSearchOpen, setMemberSearchOpen] = useState(false);
  const [memberDetailId, setMemberDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [members, setMembers] = useState<BusinessMember[] | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<PaymentTarget | null>(null);

  useEffect(() => {
    if (!business || !groupId) return;
    let alive = true;
    void Promise.all([
      businessApi.group(groupId),
      businessApi.groupMembers(groupId),
    ])
      .then(([groupDetail, memberResult]) => {
        if (!alive) return;
        setDetail(groupDetail);
        setMembers(memberResult.members);
      })
      .catch((cause) => {
        if (alive) setFeedback(errorMessage(cause));
      });
    return () => {
      alive = false;
    };
  }, [business, groupId]);

  const actorId = business?.profile?.business.id ?? "";
  const businessName =
    business?.profile?.business.name ?? "Business";
  const directoryLookup = (id: string) => {
    if (business?.profile && id === business.profile.business.id) {
      return {
        id,
        name: business.profile.business.name,
        contactName: business.profile.business.contactName,
        city: business.profile.business.city,
        category: business.profile.business.category,
        joinedAt: business.profile.joinedAt?.slice(0, 10),
      };
    }
    return (
      business?.directory.find((entry) => entry.id === id) ?? {
        id,
        name: id,
        contactName: id,
        city: "",
        category: "",
        joinedAt: "",
      }
    );
  };
  const activity = detail?.activity ?? storedActivity;

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <SkeletonCard />
        <SkeletonRows rows={6} />
      </div>
    );
  }

  if (!group) {
    return <GroupMissingState title="04 — Group Details" />;
  }

  const isOwner = group.ownerId === actorId;
  const isMember = group.memberIds.includes(actorId) || isOwner;
  const activation = selectGroupActivation(state, group);
  const pendingInvites = invitations.filter(
    (invitation) => invitation.status === "pending"
  ).length;
  const campaign =
    detail?.campaigns.find((entry) => entry.groupIds?.includes(group.id)) ??
    business?.campaigns?.items.find((entry) => entry.groupIds?.includes(group.id));
  const programme =
    (detail?.programme &&
    detail.programme.id === group.programmeId
      ? detail.programme
      : null) ?? business?.programmes?.items.find((entry) => entry.id === group.programmeId);
  const memberSource: BusinessMember[] | null =
    members ??
    group.memberIds.map((id) => {
      const entry = directoryLookup(id);
      return {
        id,
        membershipId: id,
        fullName: entry.contactName,
        businessName: entry.name,
        category: entry.category,
        location: entry.city,
        status: "active",
        role: id === group.ownerId ? "owner" : "peripheral",
        tier: "Bronze",
        joinedAt: entry.joinedAt,
      };
    });
  const previewMembers = memberSource.slice(0, 6).map((member) => ({
    id: member.id,
    name: member.businessName ?? member.fullName,
    contactName: member.fullName,
    city: member.location ?? "—",
    category: member.category ?? "—",
    joinedAt: member.joinedAt,
  }));
  const memberItems: MemberSearchItem[] = memberSource.map((member) => ({
    id: member.id,
    name: member.businessName ?? member.fullName,
    contactName: member.fullName,
    category: member.category ?? "—",
    city: member.location ?? "—",
    joinedAt: member.joinedAt ?? group.createdAt,
    isOwner: member.id === group.ownerId,
    isSelf: member.id === actorId,
    online: member.id === actorId,
  }));
  const memberDetail = memberDetailId
    ? memberItems.find((item) => item.id === memberDetailId) ?? null
    : null;
  const base = `/business/groups/${group.id}`;

  const pendingRequest = invitations.some(
    (invitation) =>
      invitation.kind === "request" &&
      invitation.inviteeId === actorId &&
      invitation.status === "pending"
  );
  const pendingInvite = invitations.some(
    (invitation) =>
      invitation.kind === "invite" &&
      invitation.inviteeId === actorId &&
      invitation.status === "pending"
  );

  const joinPlan = () => {
    if (group.source === "automatic") {
      return {
        disabled: true,
        label: "System allocated",
        hint: "Automatic groups are allocated by the system — you cannot join this one manually.",
      };
    }
    if (group.status === "Closed" || group.status === "Suspended") {
      return {
        disabled: true,
        label: "Group closed",
        hint: `This group is ${group.status.toLowerCase()} and is not accepting members.`,
      };
    }
    const config = adminConfig.groupTypes.find((entry) => entry.type === group.type);
    if (config && (config.enabled === false || config.allowJoin === false)) {
      return {
        disabled: true,
        label: "Joining disabled",
        hint: "Administrators turned off joining for this group type.",
      };
    }
    if (pendingRequest) {
      return {
        disabled: true,
        label: "Request pending",
        hint: "Your request to join is waiting for the owner.",
      };
    }
    if (pendingInvite) {
      return {
        disabled: true,
        label: "Invitation waiting",
        hint: "You have a pending invitation for this group.",
      };
    }
    if (group.accessType === "invitation") {
      return { disabled: true, label: "Invitation only", hint: ACCESS_LABELS.invitation };
    }
    if (group.accessType === "open") {
      return { disabled: false, label: "Join group", hint: ACCESS_LABELS.open };
    }
    return { disabled: false, label: "Request to join", hint: ACCESS_LABELS[group.accessType] };
  };

  const apiPlan = business
    ? ((detail?.group as BusinessGroup | undefined)?.joinPlan ??
      (group as BusinessGroup).joinPlan)
    : undefined;
  const plan = apiPlan
    ? { disabled: apiPlan.disabled, label: apiPlan.label, hint: apiPlan.hint }
    : joinPlan();

  const handleJoin = async () => {
    if (business) {
      try {
        const result = await businessApi.joinGroup(group.id);
        await business.refresh();
        setFeedback(
          result.status === "joined"
            ? `You joined ${group.name}`
            : `Join request sent to ${group.name}`
        );
      } catch (cause) {
        if (cause instanceof ApiError) {
          const body = cause.body as
            | {
                code?: string;
                amount?: number;
                amountMinor?: string;
                frequency?: string;
                groupId?: string;
                message?: string;
              }
            | null;
          if (body?.code === "PAYMENT_REQUIRED") {
            const amountPounds =
              body.amountMinor !== undefined
                ? Number(body.amountMinor) / 100
                : Number(body.amount ?? group.contribution ?? 0);
            setPaymentTarget({
              kind: "CONTRIBUTION",
              groupId: body.groupId ?? group.id,
              groupName: group.name,
              payeeName: group.ownerName,
              amountPounds,
              frequency: body.frequency ?? group.contributionFrequency ?? "once",
              onPaid: async () => {
                await business.refresh();
                const [nextDetail, nextMembers] = await Promise.all([
                  businessApi.group(group.id),
                  businessApi.groupMembers(group.id),
                ]);
                setDetail(nextDetail);
                setMembers(nextMembers.members);
                setFeedback(`Contribution paid — you joined ${group.name}`);
              },
            });
            setPaymentOpen(true);
            return;
          }
        }
        setFeedback(errorMessage(cause));
      }
      return;
    }
    dispatch({
      type: "group/join",
      groupId: group.id,
      actor: { id: actorId, name: businessName },
    });
    setFeedback(
      group.accessType === "open"
        ? `You joined ${group.name}`
        : `Join request sent to ${group.name}`
    );
  };

  const actionHint = isOwner
    ? "You own this group — manage members, invitations and rules from Settings."
    : isMember
      ? "You are a member — open Activity to participate."
      : plan.hint;

  const myMembership = members?.find((member) => member.id === actorId);
  const contributionDue =
    isMember &&
    !isOwner &&
    group.pricing === "paid" &&
    Boolean(myMembership) &&
    myMembership?.contributionStatus !== "paid";

  const openContributionPayment = () => {
    if (!business) return;
    setPaymentTarget({
      kind: "CONTRIBUTION",
      groupId: group.id,
      groupName: group.name,
      payeeName: group.ownerName,
      amountPounds: group.contribution ?? 0,
      frequency: group.contributionFrequency ?? "once",
      onPaid: async () => {
        await business.refresh();
        const [nextDetail, nextMembers] = await Promise.all([
          businessApi.group(group.id),
          businessApi.groupMembers(group.id),
        ]);
        setDetail(nextDetail);
        setMembers(nextMembers.members);
        setFeedback("Contribution paid.");
      },
    });
    setPaymentOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <GroupTabsHeader
        title="04 — Group Details"
        subtitle="Group identity, ownership and the tabs for members, activity, invitations and settings."
      />

      {activation.gated && !activation.active && (
        <div className="flex items-start gap-3 rounded-2xl border border-warning-500/30 bg-warning-500/10 p-4">
          <Lock className="mt-0.5 size-5 shrink-0 text-warning-400" />
          <div>
            <p className="text-xs font-semibold text-white">
              Not active yet — {activation.current} of {activation.target} members
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
              Administrators keep this group non-functional until it reaches the recruitment
              threshold for a {activation.planName} {activation.variant} plan. Recruit{" "}
              {activation.remaining} more member{activation.remaining === 1 ? "" : "s"} and it
              switches on automatically.
            </p>
          </div>
        </div>
      )}

      <Card data-tour="group-circle">
        <CardBody className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Group Circle</CardTitle>
            {group.pricing === "paid" && (
              <Badge variant="gold">Paid · {contributionLabel(group)}</Badge>
            )}
          </div>
          <GroupCircleView
            group={group}
            actorId={actorId}
            directory={memberSource.map((member) => ({
              id: member.id,
              name: member.businessName ?? member.fullName,
              contactName: member.fullName,
              category: member.category ?? "—",
              city: member.location ?? "—",
            }))}
          />
        </CardBody>
      </Card>

      <div
        data-tour="primary-action"
        className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-ink-900/70 p-3"
      >
        <p className="mr-auto text-xs leading-relaxed text-slate-400">{actionHint}</p>
        {isOwner && (
          <LinkButton to={`${base}/settings`} size="sm">
            <Settings className="size-4" /> Manage Group
          </LinkButton>
        )}
        {contributionDue && (
          <Button size="sm" onClick={openContributionPayment}>
            <CircleDollarSign className="size-4" /> Pay contribution
          </Button>
        )}
        {isMember && !isOwner && (
          <LinkButton to={`${base}/activity`} size="sm">
            <Users className="size-4" /> Participate
          </LinkButton>
        )}
        {!isMember && pendingInvite && (
          <LinkButton to="/business/invitations" variant="outline" size="sm">
            View invitations
          </LinkButton>
        )}
        {!isMember && (
          <Button
            size="sm"
            variant={plan.disabled ? "secondary" : "primary"}
            disabled={plan.disabled}
            title={plan.hint}
            onClick={handleJoin}
          >
            {plan.disabled ? (
              group.source === "automatic" || group.accessType === "invitation" ? (
                <Lock className="size-3.5" />
              ) : (
                <Check className="size-3.5" />
              )
            ) : plan.label === "Join group" ? (
              <Check className="size-3.5" />
            ) : (
              <Send className="size-3.5" />
            )}
            {plan.label}
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <CollapsibleCard
          title="About"
          className="lg:col-span-2"
          bodyClassName="flex flex-col gap-4"
          defaultOpen={false}
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-white sm:text-lg">{group.name}</h2>
                  <GroupStatusBadge status={group.status} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <GroupTypeBadge type={group.type} />
                  <GroupSourceBadge source={group.source} />
                  {group.stage && <Badge variant="warning">{group.stage}</Badge>}
                  {group.pricing === "paid" && (
                    <Badge variant="gold">
                      Paid · £{group.contribution ?? 0} per member
                    </Badge>
                  )}
                  <Badge variant={isOwner ? "gold" : "default"}>
                    {isOwner ? "You own this group" : isMember ? "You are a member" : "Not a member"}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold leading-none text-white">
                  {memberCountOf(group).toLocaleString("en-GB")}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">members</p>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-slate-400">{group.purpose}</p>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetaTile icon={<Users className="size-4" />} label="Owner" value={group.ownerName} />
              <MetaTile
                icon={<CalendarDays className="size-4" />}
                label="Created"
                value={group.createdAt}
              />
              <MetaTile
                icon={<MapPin className="size-4" />}
                label="Location"
                value={
                  group.location
                    ? group.location.localArea
                      ? `${group.location.localArea}, ${group.location.city}`
                      : group.location.city!
                    : "Not location-bound"
                }
              />
              <MetaTile
                icon={<ShieldCheck className="size-4" />}
                label="Access"
                value={ACCESS_LABELS[group.accessType]}
              />
              <MetaTile
                icon={<CircleDollarSign className="size-4" />}
                label="Contribution"
                value={
                  group.pricing === "paid"
                    ? contributionLabel(group)
                    : "Free — no contribution"
                }
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  Related Opportunities / Campaigns
                </p>
                {campaign ? (
                  <>
                    <p className="mt-1 text-sm font-semibold text-white">{campaign.name}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="info">{campaign.status}</Badge>
                      <LinkButton
                        to="/business/campaigns"
                        variant="ghost"
                        size="sm"
                        className="px-0"
                      >
                        Open Campaigns
                      </LinkButton>
                    </div>
                  </>
                ) : (
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    No campaign linked to this group — opportunities appear here once one is
                    connected (Group ≠ Campaign).
                  </p>
                )}
              </div>
              {programme && (
                <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">
                    Membership programme
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">{programme.name}</p>
                  <Badge variant="gold" className="mt-2">{programme.tier}</Badge>
                </div>
              )}
              {group.requiredSize && (
                <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">
                    Target size
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {memberCountOf(group)} / {group.requiredSize}
                  </p>
                </div>
              )}
            </div>
        </CollapsibleCard>

        <CollapsibleCard
          title="At a glance"
          bodyClassName="flex h-full flex-col gap-3"
          defaultOpen={false}
        >
            <GlanceRow label="Members" value={String(memberCountOf(group))} />
            <GlanceRow label="Pending invitations" value={String(pendingInvites)} />
            <GlanceRow label="Access type" value={group.accessType} />
            <GlanceRow
              label="Source"
              value={group.source === "automatic" ? "System created" : "Member created"}
            />
            <div className="mt-auto flex flex-col gap-2 pt-2">
              <LinkButton to={`/business/groups/${group.id}/members`} size="sm" className="w-full">
                <Users className="size-4" /> View members
              </LinkButton>
              <LinkButton
                to={`/business/groups/${group.id}/invitations`}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {isOwner ? "Invite members" : "Invitations"}
              </LinkButton>
            </div>
        </CollapsibleCard>
      </div>

      <CollapsibleCard
        title="Relationships (Group ≠ Location ≠ Campaign ≠ Programme)"
        data-tour="relationships"
        bodyClassName="flex flex-col gap-3"
        defaultOpen={false}
      >
          <div className="flex flex-wrap gap-2">
            <RelationshipChip
              label="Location"
              value={
                group.location
                  ? group.location.localArea
                    ? `${group.location.localArea}, ${group.location.city}`
                    : group.location.city!
                  : undefined
              }
              placeholder="Not location-bound"
            />
            <RelationshipChip label="Campaign" value={campaign?.name} placeholder="Not linked" />
            <RelationshipChip label="Programme" value={programme?.name} placeholder="Not linked" />
            <RelationshipChip
              label="Account manager"
              value={relationshipName(group.accountManagerId, detail)}
              placeholder="— not assigned"
            />
            <RelationshipChip
              label="Supporting agent"
              value={relationshipName(group.agentId, detail)}
              placeholder="— not assigned"
            />
            <RelationshipChip
              label="Consultant"
              value={relationshipName(group.consultantId, detail)}
              placeholder="— not assigned"
            />
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">
            Each relationship is maintained in its own place — this strip only reports what is
              currently linked, never edits it. Placeholder rows stay visible so the shape of the
              data model is obvious even when nothing is linked yet.
          </p>
      </CollapsibleCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <CollapsibleCard
          title="Members"
          bodyClassName="flex flex-col gap-3"
          defaultOpen={false}
          action={
            <LinkButton
              to={`/business/groups/${group.id}/members`}
              variant="ghost"
              size="sm"
            >
              View all {group.memberIds.length}
            </LinkButton>
          }
        >
            <MemberSearch
              members={memberItems}
              open={memberSearchOpen}
              onToggle={() => setMemberSearchOpen((value) => !value)}
              onSelect={setMemberDetailId}
              label="Members"
            />
            {!memberSearchOpen && (
              <div className="flex flex-col gap-2">
                {previewMembers.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setMemberDetailId(member.id)}
                    className="group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-ink-950/60 p-3 text-left transition-colors hover:border-gold-500/40 focus-visible:outline-2 focus-visible:outline-gold-500"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-white">
                        {member.name}
                      </p>
                      <p className="truncate text-[11px] text-slate-500">
                        {member.category} · {member.city}
                      </p>
                    </div>
                    {member.id === group.ownerId && <Badge variant="gold">Owner</Badge>}
                    {member.id === actorId && member.id !== group.ownerId && (
                      <Badge variant="info">You</Badge>
                    )}
                    <ChevronRight className="size-4 shrink-0 text-slate-600 transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            )}
        </CollapsibleCard>

        <CollapsibleCard
          title="Activity"
          bodyClassName="flex flex-col gap-3"
          defaultOpen={false}
          action={
            <LinkButton
              to={`/business/groups/${group.id}/activity`}
              variant="ghost"
              size="sm"
            >
              View all
            </LinkButton>
          }
        >
            {activity.length === 0 ? (
              <EmptyState
                title="No activity recorded yet"
                description="Joins, invitations and updates will appear here."
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {activity.slice(0, 4).map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-xl border border-white/10 bg-ink-950/60 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-slate-300">
                        {entry.actorName}
                      </span>
                      <span className="text-[10px] text-slate-500" title={entry.at}>
                        {relativeTime(entry.at)}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                      {entry.message}
                    </p>
                  </li>
                ))}
              </ul>
            )}
        </CollapsibleCard>
      </div>

      {feedback && <Toast message={feedback} onDismiss={() => setFeedback(null)} />}
      <MemberDetailModal member={memberDetail} onClose={() => setMemberDetailId(null)} />
      <PaymentDialog
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        target={paymentTarget}
      />
    </div>
  );
}

function relationshipName(
  id?: string,
  detail?: GroupDetail | null,
): string | undefined {
  if (!id) return undefined;
  return (
    detail?.relationships.accountManager?.id === id
      ? detail.relationships.accountManager.name
      : detail?.relationships.agent?.id === id
        ? detail.relationships.agent.name
        : detail?.relationships.consultant?.id === id
          ? detail.relationships.consultant.name
          : undefined
  );
}

function RelationshipChip({
  label,
  value,
  placeholder,
}: {
  label: string;
  value?: string;
  placeholder: string;
}) {
  const linked = Boolean(value);
  return (
    <div
      className={`rounded-xl border px-3 py-2 ${
        linked ? "border-gold-500/30 bg-gold-500/10" : "border-dashed border-white/15 bg-ink-950/60"
      }`}
    >
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-0.5 text-xs font-semibold ${linked ? "text-white" : "text-slate-500"}`}>
        {value ?? placeholder}
      </p>
    </div>
  );
}

function MetaTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3">
      <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-slate-500">
        <span className="text-gold-400">{icon}</span>
        {label}
      </p>
      <p className="mt-1.5 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function GlanceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 text-xs last:border-0 last:pb-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium capitalize text-slate-200">{value}</span>
    </div>
  );
}
