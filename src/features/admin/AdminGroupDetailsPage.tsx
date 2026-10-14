import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  MapPinned,
  ShieldCheck,
  Trash2,
  Users,
  CheckCircle2,
  XCircle,
  PauseCircle,
  Archive,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import FieldHint from "../../components/ui/FieldHint";
import ProgressBar from "../../components/ui/ProgressBar";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import TipIcon from "../../components/ui/TipIcon";
import Toast from "../../components/ui/Toast";
import { PROGRAMMES, RELATIONSHIPS } from "../../data/businessData";
import type { Group } from "../../domain/types";
import { useAppState, useGroup, useGroupActivity } from "../../store/selectors";
import { useAppStore } from "../../store/context";
import { useDemoLoading } from "../../lib/demoDelay";
import { SkeletonCard, SkeletonRows } from "../../components/ui/Skeleton";
import { memberCountOf } from "../groups/groupUtils";
import AdminGroupContributionCard from "./AdminGroupContributionCard";
import AdminGroupCircleVisualization from "./AdminGroupCircleVisualization";

type TabId = "overview" | "circle" | "contributions" | "members" | "activity" | "relationships" | "settings";

const TABS: { id: TabId; label: string; to?: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "circle", label: "Circle View" },
  { id: "contributions", label: "Contribution Process" },
  { id: "members", label: "Members", to: "members" },
  { id: "activity", label: "Activity", to: "activity" },
  { id: "relationships", label: "Relationships", to: "relationships" },
  { id: "settings", label: "Settings" },
];

const TAB_CLASS = {
  active: "bg-gold-500/15 text-gold-200 border border-gold-500/30",
  idle: "border border-transparent text-slate-400 hover:text-slate-200",
};

const ADMIN_ACTOR = { id: "admin", name: "Administrator" };

function relationshipName(id?: string): string | undefined {
  if (!id) return undefined;
  return RELATIONSHIPS.find((entry) => entry.id === id)?.name;
}

export default function AdminGroupDetailsPage() {
  const { groupId } = useParams();
  const group = useGroup(groupId);
  const state = useAppState();
  const activity = useGroupActivity(groupId);
  const [tab, setTab] = useState<TabId>("overview");
  const loading = useDemoLoading();

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <SkeletonCard />
        <SkeletonRows rows={6} />
      </div>
    );
  }

  const rule = state.adminConfig.automaticGrouping;
  const programme = PROGRAMMES.find((entry) => entry.id === group?.programmeId);

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="Admin Group Details"
        back="/admin/groups/all"
        backLabel="All Groups"
        subtitle={
          group
            ? `${group.name} — full administrative control: edit rules, moderate membership, approve or suspend.`
            : "Full administrative control over any group on the platform."
        }
        tip="Lifecycle changes live in Settings; Overview and Identity are read-only here."
      />

      {!group ? (
        <EmptyState
          title="Group not found"
          description="This id is not in the demo store — open one from the Admin Group List."
          icon={<Building2 className="size-6" />}
          action={
            <Link
              to="/admin/groups/all"
              className="inline-flex items-center gap-1 text-xs font-medium text-gold-300 hover:text-gold-200"
            >
              Back to the register <ArrowRight className="size-3.5" />
            </Link>
          }
        />
      ) : (
        <>
          <GroupIdentity group={group} />

          {group.status === "Pending Review" && (
            <PendingReviewBanner groupId={group.id} groupName={group.name} />
          )}
          {group.status === "Suspended" && (
            <div className="rounded-xl border border-danger-500/30 bg-danger-500/10 px-4 py-3">
              <p className="text-xs font-semibold text-danger-300">This group is suspended.</p>
              <p className="mt-1 text-[11px] text-danger-400/70">
                Members cannot join or interact. Approve from Settings to reactivate.
              </p>
            </div>
          )}

          <div data-tour="tabs">
            <div role="tablist" className="flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-ink-900/70 p-1">
              {TABS.map((item) =>
                item.to ? (
                  <Link
                    key={item.id}
                    to={`/admin/groups/${group.id}/${item.to}`}
                    role="tab"
                    className={`inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-medium transition-colors ${TAB_CLASS.idle}`}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={tab === item.id}
                    onClick={() => setTab(item.id)}
                    className={`inline-flex h-10 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-medium transition-colors ${
                      tab === item.id ? TAB_CLASS.active : TAB_CLASS.idle
                    }`}
                  >
                    {item.label}
                  </button>
                )
              )}
            </div>
            <div className="mt-2">
              <FieldHint>
                Members, Activity and Relationships open their own screens; Overview and Settings
                stay on this page.
              </FieldHint>
            </div>
          </div>

          {tab === "overview" && (
            <div className="flex flex-col gap-4" data-tour="overview">
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <StatCard
                  label="Members"
                  value={memberCountOf(group).toLocaleString("en-GB")}
                  hint={group.source === "automatic" ? `Threshold ${rule.threshold}` : `Target ${group.requiredSize ?? "—"}`}
                  accent="gold"
                />
                <StatCard
                  label="Owner"
                  value={group.ownerName}
                  hint={group.source === "automatic" ? "Created by the system" : "Business owner"}
                  accent="info"
                />
                <StatCard
                  label="City"
                  value={group.location?.city ?? "—"}
                  hint={group.location?.localArea ?? "No local area"}
                  accent="success"
                />
                <StatCard
                  label="Activity entries"
                  value={activity.length.toLocaleString("en-GB")}
                  hint="Recorded in this demo"
                  accent="warning"
                />
              </div>

              <Card>
                <CardBody className="flex flex-col gap-3">
                  <div className="flex items-center gap-1.5">
                    <CardTitle>Identity</CardTitle>
                    <TipIcon text="These are the group's configured identity values — this screen does not edit them." />
                  </div>
                  <p className="text-sm leading-relaxed text-slate-300">{group.purpose}</p>
                  <dl className="grid gap-2 text-xs sm:grid-cols-2">
                    <InfoRow label="Created" value={group.createdAt.slice(0, 10)} />
                    <InfoRow label="Access" value={group.accessType} capitalize />
                    <InfoRow label="Stage" value={group.stage ?? "—"} />
                    <InfoRow label="Programme" value={programme?.name ?? "No programme"} />
                    <InfoRow label="Pricing" value={group.pricing ?? "free"} capitalize />
                    {group.contribution && <InfoRow label="Contribution" value={`£${group.contribution}`} />}
                    <InfoRow label="Visibility" value={group.visibility ?? "directory"} capitalize />
                    <InfoRow label="Interaction" value={group.interactionLevel ?? "message"} capitalize />
                  </dl>
                </CardBody>
              </Card>

              {group.source === "automatic" ? (
                <Card>
                  <CardBody className="flex flex-col gap-3">
                    <CardTitle>Membership toward the automatic threshold</CardTitle>
                    <ProgressBar value={memberCountOf(group)} max={rule.threshold} label={`${memberCountOf(group)} / ${rule.threshold}`} />
                    <p className="text-xs leading-relaxed text-slate-400">
                      The threshold comes from Automatic Group Rules ({rule.threshold}).
                    </p>
                  </CardBody>
                </Card>
              ) : group.requiredSize ? (
                <Card>
                  <CardBody className="flex flex-col gap-3">
                    <div className="flex items-center gap-1.5">
                      <CardTitle>Membership toward the group's target size</CardTitle>
                      <TipIcon text="The target size is set by the group owner when the group is created." />
                    </div>
                    <ProgressBar value={memberCountOf(group)} max={group.requiredSize} label={`${memberCountOf(group)} / ${group.requiredSize}`} />
                  </CardBody>
                </Card>
              ) : null}

              {/* Paid Group Contribution Process & Ledger */}
              <AdminGroupContributionCard group={group} showHeader={true} />

              {/* Circle Hierarchy Quick Access Card */}
              <Card className="border border-gold-500/30 bg-ink-900/60">
                <CardBody className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                      <span className="size-2 rounded-full bg-gold-400" /> Circular Member Network
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      View all {memberCountOf(group)} members positioned in orbital concentric rings around group owner <strong>{group.ownerName}</strong> at the center.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTab("circle")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gold-500/40 bg-gold-500/15 px-3 py-1.5 text-xs font-semibold text-gold-300 hover:bg-gold-500/25 transition-colors"
                  >
                    Open Circle View <ArrowRight className="size-3.5" />
                  </button>
                </CardBody>
              </Card>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardBody className="flex flex-col gap-3">
                    <div className="flex items-center gap-1.5">
                      <CardTitle>Relationships</CardTitle>
                      <TipIcon text="Not assigned means no one covers this group in that role yet." />
                    </div>
                    <ul className="flex flex-col gap-2 text-xs">
                      <InfoRow label="Account manager" value={relationshipName(group.accountManagerId) ?? "Not assigned"} />
                      <InfoRow label="Agent" value={relationshipName(group.agentId) ?? "Not assigned"} />
                      <InfoRow label="Consultant" value={relationshipName(group.consultantId) ?? "Not assigned"} />
                    </ul>
                    <Link
                      to={`/admin/groups/${group.id}/relationships`}
                      className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-gold-300 hover:text-gold-200"
                    >
                      Open the full relationship view <ArrowRight className="size-3.5" />
                    </Link>
                  </CardBody>
                </Card>

                <Card>
                  <CardBody className="flex flex-col gap-3">
                    <CardTitle>Location</CardTitle>
                    <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-ink-950/60 p-3 text-[11px] leading-relaxed text-slate-500">
                      <MapPinned className="mt-px size-3.5 shrink-0 text-gold-400" />
                      {group.location
                        ? `${group.location.city ?? "No city"} · ${group.location.localArea ?? "No local area"}`
                        : "This group has no location."}
                    </div>
                  </CardBody>
                </Card>
              </div>

              <Card>
                <CardBody className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <CardTitle>Latest activity</CardTitle>
                      <TipIcon text="The three most recent entries — the Activity tab holds the full trail." />
                    </div>
                    <Link
                      to={`/admin/groups/${group.id}/activity`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-gold-300 hover:text-gold-200"
                    >
                      Open activity <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                  {activity.length === 0 ? (
                    <p className="text-xs text-slate-400">No activity recorded.</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {activity.slice(0, 3).map((entry) => (
                        <li
                          key={entry.id}
                          className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5 text-xs"
                        >
                          <span className="text-slate-300">{entry.message}</span>
                          <span className="shrink-0 text-[11px] text-slate-500">{entry.at.slice(0, 10)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardBody>
              </Card>
            </div>
          )}

          {tab === "circle" && (
            <Card>
              <CardBody className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <CardTitle>Group Members — Circular Network</CardTitle>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Owner <strong>{group.ownerName}</strong> is positioned at the central hub with connected member orbits.
                    </p>
                  </div>
                  <Badge variant="gold">Owner at Center</Badge>
                </div>
                <AdminGroupCircleVisualization group={group} />
              </CardBody>
            </Card>
          )}

          {tab === "contributions" && (
            <AdminGroupContributionCard group={group} showHeader={true} />
          )}

          {tab === "settings" && <GroupSettingsPanel group={group} />}
        </>
      )}
    </div>
  );
}

function InfoRow({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
      <dt className="text-slate-400">{label}</dt>
      <dd className={`font-semibold text-white ${capitalize ? "capitalize" : ""}`}>{value}</dd>
    </div>
  );
}

function PendingReviewBanner({ groupId, groupName }: { groupId: string; groupName: string }) {
  const { dispatch } = useAppStore();
  const [feedback, setFeedback] = useState<string | null>(null);

  const approve = () => {
    dispatch({ type: "admin/group-approve", groupId, actor: ADMIN_ACTOR });
    setFeedback(`${groupName} approved and activated`);
  };
  const reject = () => {
    dispatch({ type: "admin/group-close", groupId, actor: ADMIN_ACTOR });
    setFeedback(`${groupName} rejected`);
  };

  return (
    <>
      <div className="rounded-xl border border-warning-500/30 bg-warning-500/10 p-4">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-semibold text-warning-300">Pending Review — this group is awaiting admin approval.</p>
          <TipIcon text="Approve activates the group immediately. Reject closes it — both are recorded in the audit log." />
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={approve}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-500 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-400"
          >
            <CheckCircle2 className="size-3.5" /> Approve
          </button>
          <button
            type="button"
            onClick={reject}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-danger-500 px-4 text-xs font-semibold text-white transition-colors hover:bg-danger-400"
          >
            <XCircle className="size-3.5" /> Reject
          </button>
        </div>
      </div>
      {feedback && <Toast message={feedback} onDismiss={() => setFeedback(null)} />}
    </>
  );
}

function GroupIdentity({ group }: { group: Group }) {
  return (
    <Card data-tour="identity">
      <CardBody className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-gold-500/30 bg-gold-500/10 text-gold-400">
              <Building2 className="size-6" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold leading-snug text-white sm:text-lg">{group.name}</h2>
              <p className="mt-1 text-xs text-slate-400">
                {group.type} · created by {group.source === "automatic" ? "System" : group.ownerName} · {group.createdAt.slice(0, 10)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={group.source === "automatic" ? "info" : "gold"}>
              {group.source === "automatic" ? "Automatic" : "User created"}
            </Badge>
            <Badge
              variant={
                group.status === "Active"
                  ? "success"
                  : group.status === "Recruiting"
                    ? "gold"
                    : group.status === "Pending Review"
                      ? "warning"
                      : group.status === "Suspended"
                        ? "danger"
                        : "muted"
              }
            >
              {group.status}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-950/60 px-2.5 py-1.5">
            <Users className="size-3.5 text-gold-400" /> {memberCountOf(group)} members
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-950/60 px-2.5 py-1.5">
            <MapPinned className="size-3.5 text-gold-400" />
            {group.location?.city ?? "No location"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-950/60 px-2.5 py-1.5">
            <ShieldCheck className="size-3.5 text-gold-400" /> {group.accessType} access
          </span>
        </div>
      </CardBody>
    </Card>
  );
}

function GroupSettingsPanel({ group }: { group: Group }) {
  const { dispatch } = useAppStore();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<string | null>(null);

  const act = (label: string, fn: () => void) => {
    fn();
    setFeedback(label);
  };

  const approve = () =>
    act(`${group.name} approved`, () => dispatch({ type: "admin/group-approve", groupId: group.id, actor: ADMIN_ACTOR }));
  const suspend = () =>
    act(`${group.name} suspended`, () => dispatch({ type: "admin/group-suspend", groupId: group.id, actor: ADMIN_ACTOR }));
  const close = () =>
    act(`${group.name} closed`, () => dispatch({ type: "admin/group-close", groupId: group.id, actor: ADMIN_ACTOR }));
  const remove = () => {
    dispatch({ type: "admin/group-delete", groupId: group.id, actor: ADMIN_ACTOR });
    navigate("/admin/groups/all");
  };

  return (
    <div className="flex flex-col gap-4" data-tour="settings">
      <Card>
        <CardBody className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5">
            <CardTitle>Group configuration</CardTitle>
            <TipIcon text="The current values, shown for reference — the controls are in Lifecycle actions below." />
          </div>
          <dl className="grid gap-2 text-xs sm:grid-cols-2">
            <InfoRow label="Access type" value={group.accessType} capitalize />
            <InfoRow label="Stage" value={group.stage ?? "—"} />
            <InfoRow label="Status" value={group.status} />
            <InfoRow label="Required size" value={group.requiredSize ? String(group.requiredSize) : "Not set"} />
            <InfoRow label="Pricing" value={group.pricing ?? "free"} capitalize />
            <InfoRow label="Contribution" value={group.contribution ? `£${group.contribution}` : "—"} />
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5">
            <CardTitle>Lifecycle actions</CardTitle>
            <TipIcon text="Buttons only appear when they match the group's current status. Delete removes the group and cannot be undone." />
          </div>
          <div className="flex flex-wrap gap-2">
            {group.status === "Pending Review" && (
              <ActionBtn icon={<CheckCircle2 className="size-3.5" />} label="Approve" onClick={approve} color="emerald" />
            )}
            {group.status === "Suspended" && (
              <ActionBtn icon={<CheckCircle2 className="size-3.5" />} label="Reactivate" onClick={approve} color="emerald" />
            )}
            {group.status === "Active" && (
              <ActionBtn icon={<PauseCircle className="size-3.5" />} label="Suspend" onClick={suspend} color="warning" />
            )}
            {group.status !== "Closed" && (
              <ActionBtn icon={<Archive className="size-3.5" />} label="Close" onClick={close} color="slate" />
            )}
            <ActionBtn icon={<Trash2 className="size-3.5" />} label="Delete" onClick={remove} color="danger" />
          </div>
          <p className="rounded-xl border border-white/10 bg-ink-950/60 p-3 text-[11px] leading-relaxed text-slate-500">
            All actions are available to the administrator regardless of group ownership. Every action is recorded in the audit log.
          </p>
        </CardBody>
      </Card>

      {feedback && <Toast message={feedback} onDismiss={() => setFeedback(null)} />}
    </div>
  );
}

function ActionBtn({
  icon,
  label,
  onClick,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color: "emerald" | "warning" | "danger" | "slate";
}) {
  const colors = {
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20",
    warning: "border-warning-500/30 bg-warning-500/10 text-warning-300 hover:bg-warning-500/20",
    danger: "border-danger-500/30 bg-danger-500/10 text-danger-300 hover:bg-danger-500/20",
    slate: "border-white/10 bg-ink-950/60 text-slate-300 hover:bg-white/5",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${colors[color]}`}
    >
      {icon} {label}
    </button>
  );
}
