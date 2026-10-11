import { Layers, MessageSquare, Plus, RefreshCw, Sparkles, UserPlus, Wallet } from "lucide-react";
import type { ActivityEvent, CircleMember, GroupCircle, NetworkList } from "../../domain/types";
import { circleTypeMeta, TIER_ORDER, TIERS } from "../../domain/constants";

interface StatsPanelProps {
  circle: GroupCircle;
  members: CircleMember[];
  filteredCount: number;
  sourceLists: NetworkList[];
  activity: ActivityEvent[];
  onAddMember: () => void;
}

const activityIcon = {
  join: UserPlus,
  message: MessageSquare,
  update: RefreshCw,
} as const;

const activityColor = {
  join: "text-emerald-300 bg-emerald-500/15",
  message: "text-sky-300 bg-sky-500/15",
  update: "text-gold-300 bg-gold-500/15",
} as const;

const chipClass = "rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-slate-200";

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function StatsPanel({
  circle,
  members,
  filteredCount,
  sourceLists,
  activity,
  onAddMember,
}: StatsPanelProps) {
  const meta = circleTypeMeta(circle.type);
  const coreCount = members.filter((m) => m.role === "core" || m.role === "banker").length;
  const peripheralCount = members.length - coreCount;
  const activeCount = members.filter((m) => m.status === "active").length;

  return (
    <aside className="flex w-full flex-col gap-4 self-start lg:w-80">
      <section className="rounded-2xl border border-white/10 bg-ink-900/70 p-4">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{ backgroundColor: meta.accentSoft, color: meta.accent }}
        >
          <Sparkles className="size-3" />
          {meta.shortLabel}
        </span>
        <h2 className="mt-2.5 text-base font-semibold text-white">{circle.config.name}</h2>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{circle.config.description}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className={chipClass}>{circle.config.duration}-day campaign</span>
          <span className={chipClass}>{circle.config.visibility}</span>
          <span className={chipClass}>{circle.config.interactionLevel}</span>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-ink-900/70 p-4">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="rounded-xl bg-white/5 px-1 py-2.5">
            <p className="text-lg font-bold text-white">{members.length}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Total</p>
          </div>
          <div className="rounded-xl bg-white/5 px-1 py-2.5">
            <p className="text-lg font-bold" style={{ color: meta.accent }}>{coreCount}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Core</p>
          </div>
          <div className="rounded-xl bg-white/5 px-1 py-2.5">
            <p className="text-lg font-bold text-slate-300">{peripheralCount}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Outer</p>
          </div>
          <div className="rounded-xl bg-white/5 px-1 py-2.5">
            <p className="text-lg font-bold text-emerald-300">{activeCount}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Active</p>
          </div>
        </div>
        <p className="mt-2.5 text-[11px] text-slate-500">
          {filteredCount} of {members.length} members match the current filters.
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-ink-900/70 p-4">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Layers className="size-3.5 text-gold-400" />
          Built from My Network lists
        </h3>
        <ul className="mt-3 flex flex-col gap-2">
          {sourceLists.map((list) => (
            <li
              key={list.id}
              className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2"
            >
              <span className="min-w-0">
                <span className="block truncate text-xs font-medium text-slate-200">{list.name}</span>
                <span className="block text-[10px] text-slate-500">
                  {list.source} · {list.geography} · {list.type}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-300">
                {list.contactIds.length}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {meta.requiresBanker && (
        <section className="rounded-2xl border border-gold-500/30 bg-gold-500/5 p-4">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gold-300">
            <Wallet className="size-3.5" />
            Smart Money rules
          </h3>
          <ul className="mt-2.5 flex flex-col gap-1 text-[11px] text-slate-300">
            <li>6-12 members, one designated Banker</li>
            <li>Weekly contributions by membership tier</li>
            <li>Rotational payout with swappable draw dates</li>
            <li>Banker covers one missed payment per cycle</li>
          </ul>
          <table className="mt-3 w-full text-[11px]">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="pb-1 font-medium">Tier</th>
                <th className="pb-1 font-medium">Duration</th>
                <th className="pb-1 text-right font-medium">Weekly</th>
              </tr>
            </thead>
            <tbody>
              {TIER_ORDER.map((tier) => (
                <tr key={tier} className="border-t border-white/5 text-slate-300">
                  <td className="py-1.5 font-medium text-gold-200">{tier}</td>
                  <td className="py-1.5">{TIERS[tier].durationDays} days</td>
                  <td className="py-1.5 text-right">£{TIERS[tier].weeklyAmount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="rounded-2xl border border-white/10 bg-ink-900/70 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Activity feed</h3>
        <ul className="mt-3 flex max-h-56 flex-col gap-2.5 overflow-y-auto pr-1">
          {activity.map((event) => {
            const Icon = activityIcon[event.kind];
            return (
              <li key={event.id} className="flex items-start gap-2.5">
                <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${activityColor[event.kind]}`}>
                  <Icon className="size-3" />
                </span>
                <span>
                  <span className="block text-[11px] leading-snug text-slate-300">{event.message}</span>
                  <span className="block text-[10px] text-slate-600">{formatDateTime(event.at)}</span>
                </span>
              </li>
            );
          })}
          {activity.length === 0 && <li className="text-[11px] text-slate-600">No activity yet.</li>}
        </ul>
      </section>

      <button
        type="button"
        onClick={onAddMember}
        className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-ink-900/40 px-4 py-3 text-xs font-semibold text-slate-300 transition-colors hover:border-gold-500/50 hover:text-gold-200"
      >
        <Plus className="size-4" />
        Add member from My Network
      </button>
    </aside>
  );
}
