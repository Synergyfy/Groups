import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Building2, CheckCircle2, Users } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import LinkButton from "../../components/ui/LinkButton";
import SectionHeader from "../../components/ui/SectionHeader";
import { SkeletonCard, SkeletonRows } from "../../components/ui/Skeleton";
import StatCard from "../../components/ui/StatCard";
import TipIcon from "../../components/ui/TipIcon";
import BarChart from "../../components/ui/charts/BarChart";
import type { BarDatum } from "../../components/ui/charts/BarChart";
import Donut from "../../components/ui/charts/Donut";
import { PROGRAMMES } from "../../data/businessData";
import { useDemoLoading } from "../../lib/demoDelay";
import { useAppState, useNetworkStats } from "../../store/selectors";
import { memberCountOf } from "../groups/groupUtils";

function toBars(counts: Map<string, number>): BarDatum[] {
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function tally(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) {
    const key = value.trim().length > 0 ? value : "Unset";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export default function AdminGroupsDashboardPage() {
  const loading = useDemoLoading();
  const state = useAppState();
  const network = useNetworkStats();

  const groups = state.groups;
  const totalMembers = groups.reduce((sum, group) => sum + memberCountOf(group), 0);
  const businesses = new Set(groups.map((group) => group.ownerId)).size;
  const automatic = groups.filter((group) => group.source === "automatic").length;
  const userCreated = groups.length - automatic;

  const pendingReview = groups.filter((group) => group.status === "Pending Review");
  const pendingInvites = state.invitations.filter((invitation) => invitation.status === "pending");
  const needsAttention = pendingReview.length + pendingInvites.length;

  const byType = toBars(tally(groups.map((group) => group.type)));
  const byCity = toBars(
    tally(groups.map((group) => group.location?.city ?? "No location"))
  );
  const byStage = toBars(tally(groups.map((group) => group.stage ?? "Unset")));
  const byStatus = toBars(tally(groups.map((group) => group.status)));

  const programmeNames = new Map(PROGRAMMES.map((entry) => [entry.id, entry.name]));
  const byProgramme = toBars(
    tally(
      groups.map((group) =>
        group.programmeId ? (programmeNames.get(group.programmeId) ?? group.programmeId) : "No programme"
      )
    )
  );

  const rule = state.adminConfig.automaticGrouping;

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <SkeletonCard />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonRows rows={5} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="14 — Admin Groups Dashboard"
        subtitle="National group network summary: every group, member and business in the demo store, plus what needs an administrator's attention."
        tip="Everything here is read-only — approval and editing happen in the group list and the moderation queue."
        actions={
          <LinkButton to="/admin/groups/all" size="sm">
            All groups <ArrowRight className="size-3.5" />
          </LinkButton>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4" data-tour="stats">
        <StatCard
          label="Total groups"
          value={groups.length.toLocaleString("en-GB")}
          hint="Automatic and user created"
          accent="gold"
        />
        <StatCard
          label="Total members"
          value={totalMembers.toLocaleString("en-GB")}
          hint="Seats across every group"
          accent="info"
        />
        <StatCard
          label="Businesses represented"
          value={businesses.toLocaleString("en-GB")}
          hint="Distinct group owners"
          accent="success"
        />
        <StatCard
          label="Needs attention"
          value={needsAttention.toLocaleString("en-GB")}
          hint="Pending review groups + open invitations"
          accent={needsAttention > 0 ? "warning" : "success"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3" data-tour="attention">
        <Card className="lg:col-span-2">
          <CardBody className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <CardTitle>Needs attention</CardTitle>
                <TipIcon text="Groups waiting for review plus invitations without an answer. Open an item to act on it." />
              </div>
            </div>

            {needsAttention === 0 ? (
              <div className="flex items-center gap-2 rounded-xl border border-success-500/25 bg-success-500/[0.06] px-3 py-2.5 text-xs text-success-400">
                <CheckCircle2 className="size-4" />
                Nothing is waiting: no group is pending review and no invitation is open.
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {pendingReview.slice(0, 4).map((group) => (
                  <li key={group.id}>
                    <Link
                      to={`/admin/groups/${group.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5 transition-colors hover:border-warning-500/40"
                    >
                      <span className="flex min-w-0 items-center gap-2 text-xs">
                        <AlertTriangle className="size-4 shrink-0 text-warning-400" />
                        <span className="truncate font-semibold text-white">{group.name}</span>
                        <Badge variant="warning">Pending Review</Badge>
                      </span>
                      <span className="shrink-0 text-[11px] text-slate-400">Open group</span>
                    </Link>
                  </li>
                ))}
                {pendingInvites.length > 0 && (
                  <li>
                    <Link
                      to="/admin/invitations"
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5 transition-colors hover:border-gold-500/40"
                    >
                      <span className="flex min-w-0 items-center gap-2 text-xs">
                        <Users className="size-4 shrink-0 text-gold-400" />
                        <span className="truncate font-semibold text-white">
                          {pendingInvites.length} invitation{pendingInvites.length === 1 ? "" : "s"} waiting for an answer
                        </span>
                      </span>
                      <span className="shrink-0 text-[11px] text-slate-400">Open inbox</span>
                    </Link>
                  </li>
                )}
              </ul>
            )}

            <p className="mt-auto flex items-start gap-2 rounded-xl border border-white/10 bg-ink-950/60 p-3 text-[11px] leading-relaxed text-slate-500">
              <Building2 className="mt-px size-3.5 shrink-0 text-gold-400" />
              Review is a status, not a stage: a group can sit in Pending Review at any stage of its
              configured lifecycle.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-col gap-3">
            <div className="flex items-center gap-1.5">
              <CardTitle>Automatic grouping rule</CardTitle>
              <TipIcon text="A summary of the Automatic Group Rules — change the threshold or method on that screen." />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-white">{rule.threshold}</p>
              <p className="text-xs text-slate-400">members per automatic group</p>
            </div>
            <Badge variant={rule.enabled ? "success" : "muted"}>
              {rule.enabled ? "Enabled" : "Disabled"}
            </Badge>
            <dl className="flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-400">Method</dt>
                <dd className="font-semibold text-white">{rule.method}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-400">Scope</dt>
                <dd className="font-semibold text-white">{rule.scope}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-400">Automatic network members</dt>
                <dd className="font-semibold text-white">
                  {network.automaticMembers.toLocaleString("en-GB")}
                </dd>
              </div>
            </dl>
            <Link
              to="/admin/config/automatic"
              className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-gold-300 hover:text-gold-200"
            >
              Open Automatic Group Rules <ArrowRight className="size-3.5" />
            </Link>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2" data-tour="breakdown">
        <Card>
          <CardBody className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Groups by type</CardTitle>
            </div>
            <BarChart data={byType} />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Automatic vs user created</CardTitle>
              <Badge variant="info">{automatic} automatic</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-5">
              <Donut
                data={[
                  { label: "Automatic", value: automatic, color: "#38bdf8" },
                  { label: "User created", value: userCreated, color: "#e6a92b" },
                ]}
                centerValue={String(groups.length)}
                centerLabel="groups"
              />
              <div className="flex flex-col gap-2 text-xs">
                <p className="text-slate-400">
                  The split line the whole platform is built around: system created, or created by a
                  business.
                </p>
                <p className="font-semibold text-white">
                  {automatic} automatic · {userCreated} user created
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-col gap-3">
            <CardTitle>Groups by city</CardTitle>
            <BarChart data={byCity} accent="#38bdf8" />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-col gap-3">
            <CardTitle>Groups by stage</CardTitle>
            <BarChart data={byStage} accent="#a78bfa" />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-col gap-3">
              <div className="flex items-center gap-1.5">
                <CardTitle>Groups by status</CardTitle>
                <TipIcon text="Status is the moderation state (Active, Pending Review, Suspended, Closed), not the lifecycle stage." />
              </div>
            <BarChart data={byStatus} accent="#34d399" />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-col gap-3">
              <div className="flex items-center gap-1.5">
                <CardTitle>Groups by programme</CardTitle>
                <TipIcon text="Groups with no programme assigned are counted as No programme." />
              </div>
            <BarChart data={byProgramme} accent="#fb7185" />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
