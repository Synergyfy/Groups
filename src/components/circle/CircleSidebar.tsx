import { Info, Plus, Lock } from "lucide-react";
import type { GroupCircle } from "../../domain/types";
import { useCircleTypeEntries, useCircleTypeLookup } from "../../store/selectors";

function formatList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

interface CircleSidebarProps {
  circles: GroupCircle[];
  activeCircleId: string;
  onSelect: (id: string) => void;
  memberCountOf: (circle: GroupCircle) => number;
  participantMode?: boolean;
}

export default function CircleSidebar({
  circles,
  activeCircleId,
  onSelect,
  memberCountOf,
  participantMode = false,
}: CircleSidebarProps) {
  const circleTypeMeta = useCircleTypeLookup();
  const mandatoryTypes = useCircleTypeEntries()
    .filter((entry) => entry.enabled && entry.mandatory)
    .map((entry) => entry.shortLabel);

  const mandatorySentence =
    mandatoryTypes.length === 0
      ? "Group Circles are always built from My Network lists."
      : `Every business must maintain ${formatList(mandatoryTypes)}. Group Circles are always built from My Network lists.`;

  return (
    <aside className="flex w-full flex-col gap-3 self-start lg:w-64">
      <div className="flex items-start gap-2.5 rounded-2xl border border-gold-500/30 bg-gold-500/5 p-3.5">
        <Info className="mt-0.5 size-4 shrink-0 text-gold-400" />
        <p className="text-[11px] leading-relaxed text-slate-300">
          {participantMode ? (
            <>
              You are viewing circles you have been invited to. To create your own circles and
              manage members, upgrade to a paid plan.
            </>
          ) : (
            mandatorySentence
          )}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-ink-900/70 p-3">
        <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {participantMode ? "Invited circles" : "Your circles"}
        </p>
        <ul className="flex flex-col gap-1">
          {circles.map((circle) => {
            const meta = circleTypeMeta(circle.type);
            const active = circle.id === activeCircleId;
            return (
              <li key={circle.id}>
                <button
                  type="button"
                  onClick={() => onSelect(circle.id)}
                  aria-current={active ? "true" : undefined}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-3 text-left transition-colors ${
                    active
                      ? "bg-white/10 ring-1 ring-white/20"
                      : "hover:bg-white/5"
                  }`}
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: meta.accent, boxShadow: `0 0 8px ${meta.accent}88` }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-slate-200">
                      {circle.config.name}
                    </span>
                    <span className="block text-[10px] text-slate-500">
                      {meta.shortLabel} · {memberCountOf(circle)} members
                    </span>
                  </span>
                  {meta.mandatory && (
                    <span className="shrink-0 rounded-full bg-gold-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-gold-300">
                      Required
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {participantMode ? (
          <div className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 px-3 py-2 text-[11px] font-medium text-slate-500">
            <Lock className="size-3.5" />
            Upgrade to create circles
          </div>
        ) : (
          <button
            type="button"
            disabled
            title="Circle creation flow arrives in Phase 1"
            className="mt-2 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 px-3 py-2 text-[11px] font-medium text-slate-500"
          >
            <Plus className="size-3.5" />
            New Circle
          </button>
        )}
      </div>
    </aside>
  );
}
