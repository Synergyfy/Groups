import { Users } from "lucide-react";
import type { CircleMember } from "../../domain/types";
import Avatar from "../../components/ui/Avatar";
import MemberNode from "./MemberNode";
import RingOverflowNode from "./RingOverflowNode";
import { useRingPager } from "./ringPaging";

const INNER_RADIUS = 27;
const OUTER_RADIUS = 42;

interface CircleCanvasProps {
  members: CircleMember[];
  totalInCircle: number;
  accent: string;
  onViewProfile: (member: CircleMember) => void;
  onSendMessage: (member: CircleMember) => void;
  onAddCategory: (member: CircleMember) => void;
  /** The viewer at the centre of the canvas. */
  self?: { id: string; name: string; businessName: string; photoUrl?: string | null };
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
  self: selfProp,
}: CircleCanvasProps) {
  const self = selfProp ?? { id: "", name: "Account", businessName: "Account" };
  const innerMembers = members.filter(
    (m) => m.role === "core" || m.role === "banker"
  );
  const outerMembers = members.filter(
    (m) => m.role === "peripheral" || m.role === "partner"
  );
  const innerPager = useRingPager(innerMembers);
  const outerPager = useRingPager(outerMembers);
  const inner = innerPager.visible;
  const outer = outerPager.visible;

  const innerSlots = inner.length + (innerPager.hasOverflow ? 1 : 0);
  const outerSlots = outer.length + (outerPager.hasOverflow ? 1 : 0);
  const innerPositions = ringPositions(Math.max(innerSlots, 1), INNER_RADIUS);
  const outerPositions = ringPositions(Math.max(outerSlots, 1), OUTER_RADIUS);
  const shownCount = inner.length + outer.length;

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
            aria-label={`${self.businessName} — your business`}
            className="flex size-[72px] cursor-pointer items-center justify-center overflow-hidden rounded-full shadow-[0_0_30px_rgba(230,169,43,0.35)] ring-2 ring-gold-300 transition-transform duration-200 hover:scale-105 focus-visible:scale-105 focus-visible:outline-none"
          >
            <Avatar
              id={self.id}
              name={self.name}
              src={self.photoUrl}
              className="size-full rounded-full text-sm font-bold text-ink-950"
            />
          </button>
          <span className="mt-1.5 rounded-full border border-gold-500/30 bg-ink-900/90 px-2 py-0.5 text-[10px] font-medium text-gold-200">
            {self.businessName}
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

        {innerPager.hasOverflow && (
          <RingOverflowNode
            count={innerPager.hiddenCount}
            x={innerPositions[inner.length]?.x ?? 50}
            y={innerPositions[inner.length]?.y ?? 50}
            expanded={innerPager.showingOverflow}
            label={
              innerPager.showingOverflow
                ? `Show the first ${innerPager.firstSliceSize} core members again`
                : `Show ${innerPager.hiddenCount} more core member${innerPager.hiddenCount === 1 ? "" : "s"}`
            }
            onToggle={innerPager.next}
          />
        )}

        {outerPager.hasOverflow && (
          <RingOverflowNode
            count={outerPager.hiddenCount}
            x={outerPositions[outer.length]?.x ?? 50}
            y={outerPositions[outer.length]?.y ?? 50}
            expanded={outerPager.showingOverflow}
            label={
              outerPager.showingOverflow
                ? `Show the first ${outerPager.firstSliceSize} peripheral members again`
                : `Show ${outerPager.hiddenCount} more peripheral member${outerPager.hiddenCount === 1 ? "" : "s"}`
            }
            onToggle={outerPager.next}
          />
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
          {shownCount} of {totalInCircle} members shown
        </span>
      </div>
    </div>
  );
}
