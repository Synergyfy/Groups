import { Users } from "lucide-react";
import type { CircleMember } from "../../domain/types";
import { CORE_SHORTLIST_LIMIT } from "../../domain/constants";
import Avatar from "../../components/ui/Avatar";
import { SELF } from "../../data/mockData";
import MemberNode from "./MemberNode";

const OUTER_CAP = 14;
const INNER_RADIUS = 27;
const OUTER_RADIUS = 42;

interface CircleCanvasProps {
  members: CircleMember[];
  totalInCircle: number;
  accent: string;
  onViewProfile: (member: CircleMember) => void;
  onSendMessage: (member: CircleMember) => void;
  onAddCategory: (member: CircleMember) => void;
}

function ringPositions(count: number, radiusPercent: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = ((360 / count) * i - 90) * (Math.PI / 180);
    return {
      x: 50 + radiusPercent * Math.cos(angle),
      y: 50 + radiusPercent * Math.sin(angle),
    };
  });
}

export default function CircleCanvas({
  members,
  totalInCircle,
  accent,
  onViewProfile,
  onSendMessage,
  onAddCategory,
}: CircleCanvasProps) {
  const inner = members
    .filter((m) => m.role === "core" || m.role === "banker")
    .slice(0, CORE_SHORTLIST_LIMIT);
  const outerRest = members.filter((m) => m.role === "peripheral" || m.role === "partner");
  const outer = outerRest.slice(0, OUTER_CAP);
  const overflow = outerRest.length - outer.length;

  const innerPositions = ringPositions(Math.max(inner.length, 1), INNER_RADIUS);
  const outerPositions = ringPositions(Math.max(outer.length, 1), OUTER_RADIUS);

  return (
    <div>
      <div className="relative mx-auto aspect-square w-full max-w-[560px]">
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute inset-0 rounded-full border border-dashed border-white/10 animate-ring-spin" />
        </div>
        <div className="absolute inset-[8%] rounded-full border border-dashed border-white/15" />
        <div className="absolute inset-[23%] rounded-full border border-white/10" />
        <div
          className="absolute left-1/2 top-1/2 size-[42%] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: `radial-gradient(circle, ${accent}26 0%, transparent 70%)` }}
        />

        <div className="absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
          <button
            type="button"
            aria-label={`${SELF.businessName} — your business`}
            className="flex size-[72px] cursor-pointer items-center justify-center overflow-hidden rounded-full shadow-[0_0_30px_rgba(230,169,43,0.35)] ring-2 ring-gold-300 transition-transform duration-200 hover:scale-105 focus-visible:scale-105 focus-visible:outline-none"
          >
            <Avatar
              id={SELF.id}
              name={SELF.fullName}
              className="size-full rounded-full text-sm font-bold text-ink-950"
            />
          </button>
          <span className="mt-1.5 rounded-full border border-gold-500/30 bg-ink-900/90 px-2 py-0.5 text-[10px] font-medium text-gold-200">
            {SELF.businessName}
          </span>
        </div>

        {inner.map((member, i) => {
          const pos = innerPositions[i];
          return (
          <MemberNode
            key={member.id}
            member={member}
            x={pos.x}
            y={pos.y}
            size={52}
            ring="inner"
            accent={accent}
            onViewProfile={onViewProfile}
            onSendMessage={onSendMessage}
            onAddCategory={onAddCategory}
          />
          );
        })}

        {outer.map((member, i) => {
          const pos = outerPositions[i];
          return (
          <MemberNode
            key={member.id}
            member={member}
            x={pos.x}
            y={pos.y}
            size={42}
            ring="outer"
            accent={accent}
            onViewProfile={onViewProfile}
            onSendMessage={onSendMessage}
            onAddCategory={onAddCategory}
          />
          );
        })}

        {overflow > 0 && (
          <div
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${outerPositions[outer.length]?.x ?? 50}%`,
              top: `${outerPositions[outer.length]?.y ?? 50}%`,
            }}
            title={`${overflow} more member${overflow === 1 ? "" : "s"} beyond the displayed ring`}
          >
            <div className="flex size-10 items-center justify-center rounded-full border border-dashed border-white/30 bg-ink-800 text-[10px] font-semibold text-slate-300">
              +{overflow}
            </div>
          </div>
        )}

        {members.length === 0 && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 text-slate-500">
            <Users className="size-8" />
            <p className="text-sm">No members match the current filters</p>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-gold-500" />
          Banker
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ backgroundColor: accent }} />
          Core · inner ring
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-white/40" />
          Peripheral · outer ring
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-slate-600" />
          Inactive
        </span>
        <span className="text-slate-500">
          {members.length} of {totalInCircle} members shown
        </span>
      </div>
    </div>
  );
}
