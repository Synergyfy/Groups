import { Link } from "react-router-dom";
import { CheckCircle2, Cog, Cpu, Info, Sparkles, UserRound } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import LinkButton from "../../components/ui/LinkButton";
import ProgressBar from "../../components/ui/ProgressBar";
import SectionHeader from "../../components/ui/SectionHeader";
import { CURRENT_BUSINESS, CAMPAIGNS, findDirectoryEntry } from "../../data/businessData";
import {
  useAppState,
  useAutomaticProgress,
  useGroup,
  useGroupActivity,
} from "../../store/selectors";
import { memberCountOf } from "./groupUtils";

const ACTOR_ID = CURRENT_BUSINESS.id;

const ACTIVITY_LABELS: Record<string, string> = {
  join: "Join",
  leave: "Leave",
  invite: "Invite",
  created: "Created",
  message: "Message",
  update: "Update",
  settings: "Settings",
};

export default function NetworkGroupPage() {
  const progress = useAutomaticProgress(ACTOR_ID);
  const group = useGroup(progress.group?.id);
  const activity = useGroupActivity(progress.group?.id);
  const { adminConfig } = useAppState();
  const rules = adminConfig.automaticGrouping;

  if (!group) {
    return (
      <div className="flex flex-col gap-4">
        <SectionHeader
          title="03 — Automatic Network Group"
          back="/business/groups"
          backLabel="Group Circle"
          subtitle="Your system-created network group, formed from the configured grouping rules."
        />
        <EmptyState
          title="No automatic network group assigned yet"
          description="The system assigns one automatically once you register in a city and local area. Grouping rules are managed by Central Solution administrators."
          icon={<Cog className="size-6" />}
          action={<LinkButton to="/business/groups" size="sm">Back to Group Circle</LinkButton>}
        />
      </div>
    );
  }

  const members = group.memberIds.map(findDirectoryEntry);
  const networkCampaign = CAMPAIGNS.find((entry) => entry.groupIds?.includes(group.id));

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="03 — Automatic Network Group"
        back="/business/groups"
        backLabel="Group Circle"
        subtitle="Your system-created network group, formed from the configured grouping rules — you never created it and you cannot edit its rules."
      />

      <Card data-tour="header">
        <CardBody className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{group.name}</CardTitle>
                <Badge variant="info">Automatic</Badge>
                <Badge variant="success">{group.status}</Badge>
                {group.stage && <Badge variant="warning">{group.stage}</Badge>}
              </div>
              <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-400">
                {group.purpose}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Created {group.createdAt} · {group.accessType} access
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold leading-none text-white">
                {memberCountOf(group).toLocaleString("en-GB")}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">members</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-info-500/20 bg-info-500/10 p-3">
              <p className="text-[11px] uppercase tracking-wide text-info-400">Created by</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-white">
                <Cpu className="size-3.5 text-info-400" />
                {group.ownerId === "system" ? "System" : group.ownerName}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Type</p>
              <p className="mt-1 text-sm font-semibold capitalize text-white">
                {group.source === "automatic" ? "Automatic Network" : group.type}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Owner</p>
              <p className="mt-1 text-sm font-semibold text-white">
                {group.ownerId === "system" ? "System" : group.ownerName}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Location</p>
              <p className="mt-1 text-sm font-semibold text-white">
                {group.location?.localArea ?? group.location?.city ?? "—"}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" data-tour="progress">
          <CardBody className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Growth toward the next automatic split</CardTitle>
              <Badge variant={progress.remaining > 0 ? "info" : "success"}>
                {progress.remaining > 0 ? "Recruiting" : "Threshold reached"}
              </Badge>
            </div>
            <ProgressBar
              value={progress.current}
              max={progress.threshold}
              label="Members toward the split threshold"
            />
            {progress.remaining > 0 ? (
              <p className="text-sm font-semibold text-gold-400">
                {progress.remaining} more members needed
              </p>
            ) : (
              <p className="flex items-start gap-2 rounded-xl border border-success-500/30 bg-success-500/10 p-3 text-xs leading-relaxed text-success-400">
                <CheckCircle2 className="mt-px size-3.5 shrink-0" />
                Threshold reached — this group is complete. The system will start a new network
                group using the {progress.method.toLowerCase()} rule for {rules.scope.toLowerCase()}
                .
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3">
                <p className="text-[11px] text-slate-500">Current members</p>
                <p className="mt-1 text-lg font-bold text-white">{progress.current}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3">
                <p className="text-[11px] text-slate-500">Required group size</p>
                <p className="mt-1 text-lg font-bold text-white">
                  {group.requiredSize ?? progress.threshold}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3">
                <p className="text-[11px] text-slate-500">Progress</p>
                <p className="mt-1 text-lg font-bold text-white">{progress.percent}%</p>
              </div>
            </div>
            <p className="flex items-start gap-2 rounded-xl border border-info-500/20 bg-info-500/10 p-3 text-[11px] leading-relaxed text-info-300">
              <Info className="mt-px size-3.5 shrink-0" />
              When the group reaches {progress.threshold} members the system starts a new network
              group using the {progress.method.toLowerCase()} rule for {rules.scope.toLowerCase()}.
              Thresholds are never hard-coded — an administrator can change them to 6, 12, 18 or 24.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex h-full flex-col gap-3">
            <div className="flex items-center justify-between">
              <CardTitle>Grouping rules</CardTitle>
              <Cog className="size-4 text-slate-500" />
            </div>
            <ul className="space-y-2 text-xs">
              <RuleRow label="Enabled" value={rules.enabled ? "Yes" : "No"} />
              <RuleRow label="Method" value={rules.method} />
              <RuleRow label="Scope" value={rules.scope} />
              <RuleRow label="Threshold" value={`${rules.threshold} members`} />
              <RuleRow label="Allow combining" value={rules.allowCombine ? "Yes" : "No"} />
            </ul>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Read-only for members. Administrators edit these rules under{" "}
              <Link to="/admin/config/automatic" className="text-gold-300 hover:text-gold-200">
                Admin → Automatic Group Rules
              </Link>
              .
            </p>
            <LinkButton
              to="/business/groups/explore"
              variant="outline"
              size="sm"
              className="mt-auto w-full"
            >
              <Sparkles className="size-4" /> Explore other groups
            </LinkButton>
          </CardBody>
        </Card>
      </div>

      <Card data-tour="campaigns">
        <CardBody className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Related Opportunities / Campaigns</CardTitle>
            <Badge variant="muted">Group ≠ Campaign</Badge>
          </div>
          {networkCampaign ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold-500/30 bg-gold-500/10 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {networkCampaign.name}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Opportunities and campaigns connected to this network group appear here.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="info">{networkCampaign.status}</Badge>
                <LinkButton to="/business/campaigns" variant="ghost" size="sm">
                  Open Campaigns
                </LinkButton>
              </div>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-white/15 bg-ink-950/60 p-3 text-xs leading-relaxed text-slate-500">
              No opportunity or campaign is linked to your automatic network group right now —
              when Central Solution connects one, it appears here without changing the group
              itself.
            </p>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardBody className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <CardTitle>Members ({members.length})</CardTitle>
              <Badge variant="info">Automatic membership</Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {members.map((member) => {
                const isSelf = member.id === ACTOR_ID;
                return (
                  <div
                    key={member.id}
                    className={`flex items-center gap-3 rounded-xl border p-3 ${
                      isSelf
                        ? "border-gold-500/30 bg-gold-500/10"
                        : "border-white/10 bg-ink-950/60"
                    }`}
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-ink-800 text-gold-400">
                      <UserRound className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-white">{member.name}</p>
                      <p className="truncate text-[11px] text-slate-500">
                        {member.category} · {member.city}
                      </p>
                    </div>
                    {isSelf && <Badge variant="gold" className="ml-auto">You</Badge>}
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex h-full flex-col gap-3">
            <CardTitle>Recent activity</CardTitle>
            {activity.length === 0 ? (
              <p className="text-xs text-slate-500">No recorded activity for this group yet.</p>
            ) : (
              <ul className="space-y-2">
                {activity.slice(0, 5).map((entry) => (
                  <li key={entry.id} className="rounded-xl border border-white/10 bg-ink-950/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="muted">{ACTIVITY_LABELS[entry.kind] ?? entry.kind}</Badge>
                      <span className="text-[10px] text-slate-500">{entry.at.slice(0, 10)}</span>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-300">
                      {entry.message}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <LinkButton
              to={`/business/groups/${group.id}/activity`}
              variant="ghost"
              size="sm"
              className="mt-auto w-full"
            >
              View full activity
            </LinkButton>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function RuleRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 last:border-0 last:pb-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-200">{value}</span>
    </li>
  );
}
