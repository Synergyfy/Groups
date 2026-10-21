import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronRight, Cpu, MapPin, UserRound, Users } from "lucide-react";
import type { Group } from "../../domain/types";
import ProgressBar from "../../components/ui/ProgressBar";
import Badge from "../../components/ui/Badge";
import {
  GroupSourceBadge,
  GroupStatusBadge,
  GroupTypeBadge,
} from "./GroupBadges";
import { memberCountOf } from "./groupUtils";

interface GroupProgress {
  current: number;
  required: number;
  remaining?: number;
}

interface GroupListItemProps {
  group: Group;
  to?: string;
  state?: unknown;
  footer?: ReactNode;
  progress?: GroupProgress;
  /** Caption above the progress bar — split threshold vs activation threshold. */
  progressLabel?: string;
  /** Warning line shown under the progress bar (e.g. "non-functional until…"). */
  inactiveNote?: string;
}

export default function GroupListItem({
  group,
  to,
  state,
  footer,
  progress,
  progressLabel = "Members toward the split threshold",
  inactiveNote,
}: GroupListItemProps) {
  const title = to ? (
    <Link
      to={to}
      state={state}
      className="inline-flex items-center gap-1 hover:text-gold-200"
    >
      <span className="truncate">{group.name}</span>
      <ChevronRight className="size-4 shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-gold-300" />
    </Link>
  ) : (
    <span className="truncate">{group.name}</span>
  );

  return (
    <div className="group flex flex-col gap-3 rounded-xl border border-white/10 bg-ink-900/60 p-4 transition-colors hover:border-white/20 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 text-sm font-semibold text-white">{title}</p>
          <GroupStatusBadge status={group.status} />
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <GroupTypeBadge type={group.type} />
          <GroupSourceBadge source={group.source} />
          {group.headStart && <Badge variant="info">Head start</Badge>}
          {group.stage && <BadgeMuted>{group.stage}</BadgeMuted>}
        </div>
        <span className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
          <Users className="size-3.5" />
          {memberCountOf(group).toLocaleString("en-GB")} members
          {group.location?.city && (
            <>
              <MapPin className="ml-2 size-3.5" />
              {group.location.localArea
                ? `${group.location.localArea}, ${group.location.city}`
                : group.location.city}
            </>
          )}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
          {group.source === "automatic" ? (
            <Cpu className="size-3.5 text-info-400" />
          ) : (
            <UserRound className="size-3.5 text-gold-400" />
          )}
          Created by:{" "}
          <span
            className={`font-semibold ${
              group.source === "automatic" ? "text-info-400" : "text-gold-400"
            }`}
          >
            {group.ownerId === "system" ? "System" : group.ownerName}
          </span>
        </span>
        {progress && (
          <div className="mt-2.5">
            <ProgressBar value={progress.current} max={progress.required} label={progressLabel} />
            {progress.remaining !== undefined && progress.remaining > 0 && (
              <p className="mt-1.5 text-[11px] font-semibold text-gold-300">
                {progress.remaining} more member{progress.remaining === 1 ? "" : "s"} needed
              </p>
            )}
            {inactiveNote && (
              <p className="mt-1 text-[11px] font-semibold text-warning-400">{inactiveNote}</p>
            )}
          </div>
        )}
      </div>
      {(footer || to) && (
        <div className="flex shrink-0 items-center gap-3">
          {footer}
          {to && (
            <Link
              to={to}
              state={state}
              className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-gold-400 transition-colors hover:text-gold-300"
            >
              View details
              <ArrowRight className="size-3.5" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function BadgeMuted({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-ink-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
      {children}
    </span>
  );
}
