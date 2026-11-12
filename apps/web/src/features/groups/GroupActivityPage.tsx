import { useParams } from "react-router-dom";
import { Activity } from "lucide-react";
import Badge from "../../components/ui/Badge";
import type { BadgeVariant } from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import LinkButton from "../../components/ui/LinkButton";
import { useGroup, useGroupActivity } from "../../store/selectors";
import { useDemoLoading } from "../../lib/demoDelay";
import { SkeletonCard, SkeletonRows } from "../../components/ui/Skeleton";
import { relativeTime } from "../../lib/time";
import GroupTabsHeader, { GroupMissingState } from "./GroupTabsHeader";

const KIND_META: Record<string, { label: string; variant: BadgeVariant }> = {
  join: { label: "Join", variant: "success" },
  leave: { label: "Leave", variant: "danger" },
  invite: { label: "Invite", variant: "info" },
  created: { label: "Created", variant: "gold" },
  message: { label: "Message", variant: "default" },
  update: { label: "Update", variant: "warning" },
  settings: { label: "Settings", variant: "muted" },
};

export default function GroupActivityPage() {
  const { groupId } = useParams();
  const group = useGroup(groupId);
  const activity = useGroupActivity(groupId);
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
    return <GroupMissingState title="12 — Group Activity" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <GroupTabsHeader
        title="12 — Group Activity"
        subtitle="Recent activity for this group — joins, invitations, discussions, settings changes and system updates."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="gold">{group.name}</Badge>
          <Badge variant="muted">{activity.length} events</Badge>
        </div>
        <LinkButton to={`/business/groups/${group.id}`} variant="ghost" size="sm">
          Back to group overview
        </LinkButton>
      </div>

      {activity.length === 0 ? (
        <EmptyState
          title="No activity recorded yet"
          description="Joins, invitations and updates will be listed here as soon as something happens."
          icon={<Activity className="size-6" />}
        />
      ) : (
        <ol className="relative flex flex-col gap-3 border-l border-white/10 pl-5">
          {activity.map((entry) => {
            const meta = KIND_META[entry.kind] ?? { label: entry.kind, variant: "default" as const };
            return (
              <li key={entry.id} className="relative">
                <span className="absolute -left-[1.72rem] top-4 size-2.5 rounded-full border border-ink-950 bg-gold-500" />
                <div className="rounded-2xl border border-white/10 bg-ink-900/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                      <span className="text-xs font-semibold text-white">{entry.actorName}</span>
                    </div>
                    <span
                      className="text-[11px] text-slate-500"
                      title={entry.at.replace("T", " ").slice(0, 16)}
                    >
                      {relativeTime(entry.at)} · {entry.at.slice(0, 10)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">{entry.message}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
