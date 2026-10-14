import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Check,
  ChevronRight,
  CircleDollarSign,
  Compass,
  Info,
  ListChecks,
  Mail,
  MapPinned,
  Network,
  Plus,
  Users,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import LinkButton from "../../components/ui/LinkButton";
import SectionHeader from "../../components/ui/SectionHeader";
import { SkeletonRows } from "../../components/ui/Skeleton";
import { CURRENT_BUSINESS } from "../../data/businessData";
import type { MandatoryGroupPricing } from "../../domain/types";
import { useDemoLoading } from "../../lib/demoDelay";
import {
  useActor,
  useAppState,
  useAutomaticProgress,
  useGroup,
  useMandatoryGroupStatuses,
} from "../../store/selectors";

const ACTOR_ID = CURRENT_BUSINESS.id;

function requiredPricingLabel(pricing: MandatoryGroupPricing, allowPaid: boolean): string {
  if (pricing === "paid") {
    return allowPaid ? "Paid group" : "Paid group — paid groups are off, so it starts free";
  }
  return allowPaid ? "Free or paid — your choice" : "Free — paid groups are off";
}

export default function GroupsOverviewPage() {
  const loading = useDemoLoading();
  const { exploreGroups, stats } = useActor(ACTOR_ID);
  const { adminConfig } = useAppState();
  const nationalCommunity = useGroup("grp-national");
  const automatic = useAutomaticProgress(ACTOR_ID);
  const networkGroup = automatic.group;
  const mandatoryStatuses = useMandatoryGroupStatuses(ACTOR_ID);
  const requiredGroups = mandatoryStatuses.filter((entry) => entry.required);
  const missingGroups = requiredGroups.filter((entry) => !entry.satisfied);

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="Group Circle"
        subtitle="Connect with businesses and members through groups."
      />

      {loading ? (
        <SkeletonRows rows={6} />
      ) : (
        <>
          {requiredGroups.length > 0 && (
            <div data-tour="required-groups" className="rounded-2xl border border-gold-500/30 bg-ink-900 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <ListChecks className="size-4 text-gold-500" />
                  <p className="text-sm font-semibold text-white">Required groups</p>
                  <Badge variant={missingGroups.length > 0 ? "warning" : "success"}>
                    {requiredGroups.length - missingGroups.length} / {requiredGroups.length}{" "}
                    created
                  </Badge>
                </div>
                {missingGroups.length > 0 && (
                  <span className="text-[11px] text-slate-400">
                    Create these first — every other group type unlocks afterwards.
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                Administrators require your business to own each of these groups before you can
                create any other group type.
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {requiredGroups.map((entry) => (
                  <li
                    key={entry.type}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-ink-900">
                      {entry.satisfied ? (
                        <Check className="size-4 text-success-400" />
                      ) : (
                        <span className="size-2 rounded-full bg-warning-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-white">
                        <span>{entry.type} group</span>
                        <span className="flex items-center gap-1 text-[10px] font-medium text-slate-500">
                          <CircleDollarSign className="size-3" />
                          {requiredPricingLabel(entry.pricing, adminConfig.paymentRules.allowPaid)}
                        </span>
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-400">
                        {entry.satisfied && entry.group
                          ? `Created — ${entry.group.name}`
                          : "Not created yet."}
                      </p>
                    </div>
                    {entry.satisfied ? (
                      <Badge variant="success">Created</Badge>
                    ) : (
                      <LinkButton
                        to={`/business/groups/create?type=${encodeURIComponent(entry.type)}`}
                        size="sm"
                      >
                        Create
                      </LinkButton>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-col gap-2" data-tour="actions">
            <NavRow
              to="/business/groups/mine"
              icon={<Users className="size-5" />}
              title="My Groups"
              description="The groups you belong to and the ones you own."
              badge={`${stats.mine} ${stats.mine === 1 ? "group" : "groups"}`}
              badgeVariant="gold"
            />
            <NavRow
              to="/business/groups/network"
              icon={<Network className="size-5" />}
              title="Automatic Network Group"
              description="Allocated for you by the system from your location."
              badge={
                automatic.enabled && networkGroup
                  ? `${automatic.current} / ${automatic.threshold}`
                  : "System"
              }
              badgeVariant="info"
            />
            <NavRow
              to="/business/groups/explore"
              icon={<Compass className="size-5" />}
              title="Explore Groups"
              description="Groups you can join — instantly or by request."
              badge={`${exploreGroups.length} open`}
              badgeVariant="gold"
            />
            <NavRow
              to="/business/groups/create"
              icon={<Plus className="size-5" />}
              title="Create a Group"
              description="Optional — start a group only when you need one."
            />
            <NavRow
              to="/business/invitations"
              icon={<Mail className="size-5" />}
              title="Invitations"
              description="Answer invitations and join requests from other businesses."
              badge={stats.pendingInvites > 0 ? `${stats.pendingInvites} pending` : undefined}
              badgeVariant="warning"
            />
          </div>

          <p
            data-tour="note"
            className="flex items-start gap-2 rounded-2xl border border-gold-500/30 bg-gold-500/10 p-3.5 text-xs leading-relaxed text-gold-200"
          >
            <Info className="mt-0.5 size-4 shrink-0 text-gold-500" />
            <span className="font-semibold">
              The business does not need to create a group to use Group Circle. The required groups
              above must be created first in your group dashboard before any other group type can
              be created.
            </span>
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-white">
              The business is already part of:
            </h2>
          </div>

          <div className="grid gap-2 sm:grid-cols-2" data-tour="part-of">
            <PartRow
              to="/business/community"
              icon={<Users className="size-5" />}
              label="National Community"
              value="Member"
              hint={`Since ${CURRENT_BUSINESS.nationalCommunity.joinedAt} · ${
                nationalCommunity?.name ?? "National Community"
              }`}
            />
            <PartRow
              to="/business/location"
              icon={<Building2 className="size-5" />}
              label="Its City"
              value={CURRENT_BUSINESS.city || "Not set"}
              hint="Registered location"
            />
            <PartRow
              to="/business/location"
              icon={<MapPinned className="size-5" />}
              label="Its Local Area"
              value={CURRENT_BUSINESS.localArea || "Not set"}
              hint="Decides which network group you are allocated to"
            />
            <PartRow
              to="/business/groups/network"
              icon={<Network className="size-5" />}
              label="Its automatically assigned Network Group"
              value={networkGroup?.name ?? "Assigned automatically once your city is set"}
              badge={
                automatic.enabled && networkGroup
                  ? `${automatic.current} / ${automatic.threshold}`
                  : undefined
              }
              badgeVariant="info"
              hint={
                automatic.enabled && networkGroup
                  ? automatic.remaining > 0
                    ? `${automatic.remaining} more member${
                        automatic.remaining === 1 ? "" : "s"
                      } needed`
                    : "Threshold reached — the system will start a new network group"
                  : "Maintained by the system"
              }
            />
          </div>
        </>
      )}
    </div>
  );
}

function NavRow({
  to,
  icon,
  title,
  description,
  badge,
  badgeVariant = "gold",
}: {
  to: string;
  icon: ReactNode;
  title: string;
  description: string;
  badge?: string;
  badgeVariant?: "gold" | "info" | "warning";
}) {
  return (
    <Link
      to={to}
      className="group flex min-h-[4.5rem] min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-ink-900 p-4 transition-colors hover:border-gold-500/40"
    >
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-ink-950 text-gold-500 transition-colors group-hover:border-gold-500/30">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-white">
          <span>{title}</span>
          {badge && <Badge variant={badgeVariant}>{badge}</Badge>}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">{description}</p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function PartRow({
  to,
  icon,
  label,
  value,
  hint,
  badge,
  badgeVariant = "info",
}: {
  to: string;
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
  badge?: string;
  badgeVariant?: "info" | "success";
}) {
  return (
    <Link
      to={to}
      className="group flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-ink-900 p-4 transition-colors hover:border-gold-500/40"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-ink-950 text-gold-500 transition-colors group-hover:border-gold-500/30">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
          <span className="truncate">{value}</span>
          {badge && <Badge variant={badgeVariant}>{badge}</Badge>}
        </p>
        <p className="mt-0.5 truncate text-[11px] leading-relaxed text-slate-400">{hint}</p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
