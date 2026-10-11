import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Building2, MapPinned, Settings2, ShieldCheck, Users } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import ProgressBar from "../../components/ui/ProgressBar";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import { CAMPAIGNS, PROGRAMMES, RELATIONSHIPS } from "../../data/businessData";
import type { Group } from "../../domain/types";
import { useAppState, useGroup, useGroupActivity } from "../../store/selectors";
import { useDemoLoading } from "../../lib/demoDelay";
import { SkeletonCard, SkeletonRows } from "../../components/ui/Skeleton";
import { memberCountOf } from "../groups/groupUtils";

type TabId = "overview" | "members" | "activity" | "relationships" | "settings";

const TABS: { id: TabId; label: string; to?: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "members", label: "Members", to: "members" },
  { id: "activity", label: "Activity", to: "activity" },
  { id: "relationships", label: "Relationships", to: "relationships" },
  { id: "settings", label: "Settings" },
];

const TAB_CLASS = {
  active:
    "bg-gold-500/15 text-gold-200 border border-gold-500/30",
  idle: "border border-transparent text-slate-400 hover:text-slate-200",
};

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
  const campaigns = CAMPAIGNS.filter((entry) => entry.groupIds?.includes(group?.id ?? ""));

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="16 — Admin Group Details"
        back="/admin/groups/all"
        backLabel="All Groups"
        subtitle={
          group
            ? `${group.name} — the administrator's inspection view: who owns it, where it sits, who it is linked to and which rules it lives by.`
            : "The administrator's inspection view: who owns a group, where it sits, who it is linked to and which rules it lives by."
        }
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

          <div data-tour="tabs">
            <div
              role="tablist"
              className="flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-ink-900/70 p-1"
            >
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
          </div>

          {tab === "overview" && (
            <div className="flex flex-col gap-4" data-tour="overview">
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <StatCard
                  label="Members"
                  value={memberCountOf(group).toLocaleString("en-GB")}
                  hint={
                    group.source === "automatic"
                      ? `Threshold ${rule.threshold}`
                      : `Target ${group.requiredSize ?? "—"}`
                  }
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
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle>Identity</CardTitle>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-300">{group.purpose}</p>
                  <dl className="grid gap-2 text-xs sm:grid-cols-2">
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
                      <dt className="text-slate-400">Created</dt>
                      <dd className="font-semibold text-white">{group.createdAt.slice(0, 10)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
                      <dt className="text-slate-400">Access</dt>
                      <dd className="font-semibold capitalize text-white">{group.accessType}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
                      <dt className="text-slate-400">Stage</dt>
                      <dd className="font-semibold text-white">{group.stage ?? "—"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
                      <dt className="text-slate-400">Programme</dt>
                      <dd className="font-semibold text-white">{programme?.name ?? "No programme"}</dd>
                    </div>
                  </dl>
                </CardBody>
              </Card>

              {group.source === "automatic" ? (
                <Card>
                  <CardBody className="flex flex-col gap-3">
                    <CardTitle>Membership toward the automatic threshold</CardTitle>
                    <ProgressBar
                      value={memberCountOf(group)}
                      max={rule.threshold}
                      label={`${memberCountOf(group)} / ${rule.threshold}`}
                    />
                    <p className="text-xs leading-relaxed text-slate-400">
                      The threshold comes from Automatic Group Rules ({rule.threshold}) — never from
                      the code. At the threshold the system splits this group.
                    </p>
                  </CardBody>
                </Card>
              ) : (
                group.requiredSize ? (
                  <Card>
                    <CardBody className="flex flex-col gap-3">
                      <CardTitle>Membership toward the group's target size</CardTitle>
                      <ProgressBar
                        value={memberCountOf(group)}
                        max={group.requiredSize}
                        label={`${memberCountOf(group)} / ${group.requiredSize}`}
                      />
                      <p className="text-xs leading-relaxed text-slate-400">
                        User-created groups fill toward the size their owner configured, not toward
                        the automatic threshold.
                      </p>
                    </CardBody>
                  </Card>
                ) : null
              )}

              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardBody className="flex flex-col gap-3">
                    <CardTitle>Relationships</CardTitle>
                    <ul className="flex flex-col gap-2 text-xs">
                      <li className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
                        <span className="text-slate-400">Account manager</span>
                        <span className="font-semibold text-white">
                          {relationshipName(group.accountManagerId) ?? "Not assigned"}
                        </span>
                      </li>
                      <li className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
                        <span className="text-slate-400">Agent</span>
                        <span className="font-semibold text-white">
                          {relationshipName(group.agentId) ?? "Not assigned"}
                        </span>
                      </li>
                      <li className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
                        <span className="text-slate-400">Consultant</span>
                        <span className="font-semibold text-white">
                          {relationshipName(group.consultantId) ?? "Not assigned"}
                        </span>
                      </li>
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
                    <CardTitle>Linked campaigns and locations</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      {campaigns.length === 0 ? (
                        <span className="text-xs text-slate-400">
                          No campaign is linked to this group.
                        </span>
                      ) : (
                        campaigns.map((campaign) => (
                          <Badge key={campaign.id} variant="info">
                            {campaign.name}
                          </Badge>
                        ))
                      )}
                    </div>
                    <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-ink-950/60 p-3 text-[11px] leading-relaxed text-slate-500">
                      <MapPinned className="mt-px size-3.5 shrink-0 text-gold-400" />
                      {group.location
                        ? `${group.location.city ?? "No city"} · ${group.location.localArea ?? "No local area"}`
                        : "This group has no location — the hierarchy applies to location groups only."}
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-500">
                      Group ≠ location ≠ campaign: this screen keeps all three relationships
                      visible so none of them is mistaken for another.
                    </p>
                  </CardBody>
                </Card>
              </div>

              <Card>
                <CardBody className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle>Latest activity</CardTitle>
                    <Link
                      to={`/admin/groups/${group.id}/activity`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-gold-300 hover:text-gold-200"
                    >
                      Open activity <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                  {activity.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      No activity has been recorded for this group yet.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {activity.slice(0, 3).map((entry) => (
                        <li
                          key={entry.id}
                          className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5 text-xs"
                        >
                          <span className="text-slate-300">{entry.message}</span>
                          <span className="shrink-0 text-[11px] text-slate-500">
                            {entry.at.slice(0, 10)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardBody>
              </Card>
            </div>
          )}

          {tab === "settings" && <GroupSettingsPanel group={group} />}
        </>
      )}
    </div>
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
              <h2 className="truncate text-base font-bold leading-snug text-white sm:text-lg">
                {group.name}
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                {group.type} · created by {group.source === "automatic" ? "System" : group.ownerName}{" "}
                · {group.createdAt.slice(0, 10)}
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
  const ownerControls = group.ownerId === "biz-smith";

  return (
    <div className="flex flex-col gap-4" data-tour="settings">
      <Card>
        <CardBody className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Group configuration</CardTitle>
          </div>
          <dl className="grid gap-2 text-xs sm:grid-cols-2">
            <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
              <dt className="text-slate-400">Access type</dt>
              <dd className="font-semibold capitalize text-white">{group.accessType}</dd>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
              <dt className="text-slate-400">Stage</dt>
              <dd className="font-semibold text-white">{group.stage ?? "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
              <dt className="text-slate-400">Status</dt>
              <dd className="font-semibold text-white">{group.status}</dd>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
              <dt className="text-slate-400">Required size</dt>
              <dd className="font-semibold text-white">{group.requiredSize ?? "Not set"}</dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-col gap-3">
          <CardTitle>Administrator actions</CardTitle>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!ownerControls}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-ink-950/60 px-3 py-2 text-xs font-medium text-slate-300 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Settings2 className="size-3.5" /> Edit group rules
            </button>
            <button
              type="button"
              disabled={!ownerControls}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-ink-950/60 px-3 py-2 text-xs font-medium text-slate-300 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Users className="size-3.5" /> Manage membership
            </button>
          </div>
          <p className="rounded-xl border border-white/10 bg-ink-950/60 p-3 text-[11px] leading-relaxed text-slate-500">
            {ownerControls
              ? "Ownership gate: this demo actor owns the group, so controls are enabled. A screen never implies control it does not have."
              : "Ownership gate: this group belongs to another business, so every control stays disabled. Ownership always gates administrative control in this prototype."}
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
