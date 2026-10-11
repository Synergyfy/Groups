import { useEffect, useMemo, useRef, useState } from "react";
import { Crown, Users } from "lucide-react";
import type { Group } from "../../domain/types";
import { CURRENT_BUSINESS, findDirectoryEntry } from "../../data/businessData";
import { isOnline } from "../../lib/presence";
import Avatar from "../../components/ui/Avatar";
import NodePopover from "../../components/ui/NodePopover";
import { contributionLabel } from "./groupUtils";

interface CircleMember {
  id: string;
  name: string;
  contactName: string;
  category: string;
  city: string;
  owner: boolean;
  you: boolean;
  online: boolean;
}

const MIN_SIZE = 16;
const MAX_SIZE = 46;
const NODE_GAP = 6;
const FALLBACK_WIDTH = 420;
const INNER_RADIUS = 27;
const OUTER_RADIUS = 42;
const CENTER_HALF = 32;

function ringPositions(count: number, radiusPercent: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = ((360 / count) * i - 90) * (Math.PI / 180);
    return {
      x: 50 + radiusPercent * Math.cos(angle),
      y: 50 + radiusPercent * Math.sin(angle),
    };
  });
}

function fitMembers(count: number, width: number) {
  const rIn = (INNER_RADIUS / 100) * width;
  const rOut = (OUTER_RADIUS / 100) * width;
  const radialGap = ((OUTER_RADIUS - INNER_RADIUS) / 100) * width;
  const capacity = (r: number, s: number) =>
    Math.max(1, Math.floor((2 * Math.PI * r) / (s + NODE_GAP)));

  let size = MIN_SIZE;
  let takeIn = Math.min(count, capacity(rIn, MIN_SIZE));
  let takeOut = Math.min(count - takeIn, capacity(rOut, MIN_SIZE));

  for (let candidate = MAX_SIZE; candidate >= MIN_SIZE; candidate -= 2) {
    const centerFit = 2 * (rIn - CENTER_HALF - 4);
    const ringFit = radialGap - 4;
    if (candidate > centerFit || candidate > ringFit) continue;
    const innerCap = capacity(rIn, candidate);
    const outerCap = capacity(rOut, candidate);
    const wantIn = count <= 4 ? count : Math.ceil(count / 2);
    size = candidate;
    takeIn = Math.min(wantIn, innerCap);
    takeOut = Math.min(count - takeIn, outerCap);
    if (takeIn + takeOut >= count) break;
  }

  return {
    size,
    innerCount: takeIn,
    outerCount: takeOut,
    overflow: count - takeIn - takeOut,
  };
}

function fontClassFor(size: number) {
  if (size >= 40) return "text-xs";
  if (size >= 30) return "text-[11px]";
  if (size >= 22) return "text-[9px]";
  return "text-[7px]";
}

export default function GroupCircleView({ group }: { group: Group }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [selection, setSelection] = useState<{ groupId: string; memberId: string } | null>(
    null
  );
  const [groupSelection, setGroupSelection] = useState<string | null>(null);
  const [centerAnchor, setCenterAnchor] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;
    const measure = () => setWidth(element.getBoundingClientRect().width);
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const members = useMemo(() => {
    const ids = [...new Set([group.ownerId, ...group.memberIds])].filter(
      (id) => id !== "system"
    );
    return ids.map((id) => {
      const entry = findDirectoryEntry(id);
      return {
        id,
        name: entry.name,
        contactName: entry.contactName,
        category: entry.category,
        city: entry.city,
        owner: id === group.ownerId,
        you: id === CURRENT_BUSINESS.id,
        online: id === group.ownerId || id === CURRENT_BUSINESS.id || isOnline(id),
      };
    });
  }, [group]);

  const effectiveWidth = width > 0 ? width : FALLBACK_WIDTH;
  const satellites = useMemo(() => members.filter((member) => !member.owner), [members]);
  const fit = useMemo(
    () => fitMembers(satellites.length, effectiveWidth),
    [satellites.length, effectiveWidth]
  );

  const inner = satellites.slice(0, fit.innerCount);
  const outer = satellites.slice(fit.innerCount, fit.innerCount + fit.outerCount);
  const innerPositions = ringPositions(Math.max(inner.length, 1), INNER_RADIUS);
  const outerPositions = ringPositions(Math.max(outer.length, 1), OUTER_RADIUS);
  const total = members.length;
  const onlineCount = members.filter((member) => member.online).length;
  const selectedId =
    selection && selection.groupId === group.id ? selection.memberId : null;
  const selected = selectedId
    ? members.find((member) => member.id === selectedId) ?? null
    : null;
  const groupOpen = groupSelection === group.id;

  const closeAll = () => {
    setSelection(null);
    setGroupSelection(null);
  };

  const toggleGroupInfo = () => {
    setSelection(null);
    setGroupSelection((current) => (current === group.id ? null : group.id));
  };

  const toggleMember = (memberId: string) => {
    setGroupSelection(null);
    setSelection((current) =>
      current && current.groupId === group.id && current.memberId === memberId
        ? null
        : { groupId: group.id, memberId }
    );
  };

  return (
    <div>
      {(selected || groupOpen) && (
        <div className="fixed inset-0 z-40" aria-hidden="true" onClick={closeAll} />
      )}

      <div
        ref={containerRef}
        className="relative mx-auto aspect-square w-full max-w-[460px]"
      >
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute inset-0 rounded-full border border-dashed border-white/10 animate-ring-spin" />
        </div>
        <div className="absolute inset-[8%] rounded-full border border-dashed border-white/15" />
        <div className="absolute inset-[23%] rounded-full border border-white/10" />
        <div className="absolute left-1/2 top-1/2 size-[42%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(230,169,43,0.15)_0%,transparent_70%)]" />

        <div className="absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
          <button
            type="button"
            ref={setCenterAnchor}
            onClick={toggleGroupInfo}
            aria-expanded={groupOpen}
            aria-label={`${group.ownerName} — group creator, show group information`}
            className="relative flex size-[52px] cursor-pointer items-center justify-center rounded-full shadow-[0_0_30px_rgba(230,169,43,0.35)] ring-2 ring-gold-300 transition-transform duration-200 hover:scale-105 focus-visible:scale-105 focus-visible:outline-none"
          >
            <Avatar
              id={group.ownerId}
              name={group.ownerName}
              className="size-full rounded-full text-xs font-bold text-white"
            />
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-gold-500 text-ink-950 shadow-md shadow-black/40">
              <Crown className="size-2.5" />
            </span>
          </button>
          <span className="mt-1.5 max-w-[140px] truncate rounded-full border border-gold-500/30 bg-ink-900/90 px-2 py-0.5 text-[10px] font-medium text-gold-200">
            {group.ownerName}
          </span>

          {groupOpen && (
            <NodePopover
              anchor={centerAnchor}
              active={groupOpen}
              width={224}
              className="z-30 rounded-xl border border-white/10 bg-ink-850/95 p-3 text-left shadow-2xl shadow-black/60 backdrop-blur-sm"
            >
              <p className="text-sm font-semibold text-white">{group.name}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-slate-200">
                  {group.type}
                </span>
                <span className="rounded-full bg-gold-500/15 px-2 py-0.5 font-medium text-gold-300">
                  {group.status}
                </span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-slate-200">
                  {group.source === "automatic" ? "System created" : "Member created"}
                </span>
              </div>
              <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-slate-400">
                {group.purpose}
              </p>
              <div className="mt-2.5 space-y-1 border-t border-white/10 pt-2.5 text-[11px]">
                <p className="flex justify-between gap-2">
                  <span className="text-slate-500">Owner</span>
                  <span className="truncate font-medium text-slate-200">
                    {group.ownerName}
                  </span>
                </p>
                <p className="flex justify-between gap-2">
                  <span className="text-slate-500">Members</span>
                  <span className="font-medium text-slate-200">
                    {total} · {onlineCount} online
                  </span>
                </p>
                <p className="flex justify-between gap-2">
                  <span className="text-slate-500">Contribution</span>
                  <span className="font-medium text-slate-200">
                    {contributionLabel(group)}
                  </span>
                </p>
                <p className="flex justify-between gap-2">
                  <span className="text-slate-500">Created</span>
                  <span className="font-medium text-slate-200">{group.createdAt}</span>
                </p>
                {group.location?.city && (
                  <p className="flex justify-between gap-2">
                    <span className="text-slate-500">Location</span>
                    <span className="truncate font-medium text-slate-200">
                      {group.location.localArea
                        ? `${group.location.localArea}, ${group.location.city}`
                        : group.location.city}
                    </span>
                  </p>
                )}
              </div>
            </NodePopover>
          )}
        </div>

        {inner.map((member, i) => {
          const pos = innerPositions[i];
          return (
            <GroupNode
              key={member.id}
              member={member}
              x={pos.x}
              y={pos.y}
              size={fit.size}
              index={i}
              open={selectedId === member.id}
              anyOpen={selectedId !== null}
              onToggle={() => toggleMember(member.id)}
            />
          );
        })}

        {outer.map((member, i) => {
          const pos = outerPositions[i];
          return (
            <GroupNode
              key={member.id}
              member={member}
              x={pos.x}
              y={pos.y}
              size={fit.size}
              index={i + 7}
              open={selectedId === member.id}
              anyOpen={selectedId !== null}
              onToggle={() => toggleMember(member.id)}
            />
          );
        })}

        {fit.overflow > 0 && (
          <div
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${outerPositions[outer.length]?.x ?? 50}%`,
              top: `${outerPositions[outer.length]?.y ?? 50}%`,
            }}
            title={`${fit.overflow} more member${fit.overflow === 1 ? "" : "s"} beyond the displayed ring`}
          >
            <div className="flex size-9 items-center justify-center rounded-full border border-dashed border-white/30 bg-ink-800 text-[10px] font-semibold text-slate-300">
              +{fit.overflow}
            </div>
          </div>
        )}

        {total === 0 && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 text-slate-500">
            <Users className="size-8" />
            <p className="text-sm">No members yet</p>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-400" />
          {onlineCount} online now
        </span>
        <span className="flex items-center gap-1.5">
          <svg viewBox="0 0 40 14" className="h-3 w-4" aria-hidden="true">
            <path
              d="M1 2 H39 V9 L20 13.5 L1 9 Z"
              fill="#34d399"
              stroke="rgba(10, 15, 28, 0.7)"
              strokeWidth="1.5"
            />
          </svg>
          You
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-gold-500" />
          Owner
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-white/40" />
          Member
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-slate-600" />
          Offline
        </span>
        <span className="text-slate-500">
          {total} member{total === 1 ? "" : "s"} in this group
        </span>
      </div>
    </div>
  );
}

function GroupNode({
  member,
  x,
  y,
  size,
  index,
  open,
  anyOpen,
  onToggle,
}: {
  member: CircleMember;
  x: number;
  y: number;
  size: number;
  index: number;
  open: boolean;
  anyOpen: boolean;
  onToggle: () => void;
}) {
  const ringColor = member.online
    ? "#34d399"
    : member.owner
      ? "#e6a92b"
      : "rgba(255,255,255,0.2)";
  const glow = member.online
    ? "0 0 14px rgba(52, 211, 153, 0.45)"
    : member.owner
      ? "0 0 14px rgba(230, 169, 43, 0.4)"
      : undefined;
  const zClass = open ? "z-[60]" : anyOpen ? "z-50" : "z-10";
  const showCrown = size >= 26 && member.owner;
  const showDot = size >= 20 && member.online;
  const showRibbon = member.you && size >= 24;
  const ribbonColor = member.online ? "#34d399" : "#f87171";
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <div
      className={`absolute -translate-x-1/2 -translate-y-1/2 ${zClass}`}
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size }}
    >
      <button
        type="button"
        ref={setAnchor}
        onClick={onToggle}
        aria-expanded={open}
        aria-label={`${member.name}${member.online ? " — online" : " — offline"}${member.you ? " — you" : ""}`}
        className={`animate-node-zoom relative flex size-full cursor-pointer items-center justify-center rounded-full border border-white/10 font-bold text-white transition-[filter,border-color] duration-200 hover:border-white/40 hover:brightness-110 focus-visible:border-gold-300 focus-visible:outline-none ${fontClassFor(size)} ${member.online || member.owner ? "ring-2" : "ring-1"}`}
        style={{
          boxShadow: glow,
          ["--tw-ring-color" as string]: ringColor,
          animationDelay: `${(index % 8) * 0.3}s`,
        }}
      >
        <Avatar id={member.id} name={member.name} className="size-full rounded-full" />
        {showCrown && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-gold-500 text-ink-950 shadow-md shadow-black/40">
            <Crown className="size-2.5" />
          </span>
        )}
        {showDot && (
          <span
            className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-400 ring-2 ring-ink-900"
            aria-hidden="true"
          />
        )}
        {showRibbon && (
          <svg
            viewBox="0 0 40 14"
            aria-hidden="true"
            className="absolute -bottom-1.5 left-1/2 w-[78%] -translate-x-1/2"
          >
            <path
              d="M1 2 H39 V9 L20 13.5 L1 9 Z"
              fill={ribbonColor}
              stroke="rgba(10, 15, 28, 0.7)"
              strokeWidth="1.5"
            />
          </svg>
        )}
      </button>

      {open && (
        <NodePopover
          anchor={anchor}
          active={open}
          width={192}
          className="z-[70] rounded-xl border border-white/10 bg-ink-850/95 p-3 text-left shadow-2xl shadow-black/60 backdrop-blur-sm"
        >
          <div className="flex items-center gap-2.5">
            <Avatar
              id={member.id}
              name={member.name}
              className="size-10 shrink-0 rounded-full text-xs font-bold text-white"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{member.name}</p>
              <p className="truncate text-xs text-slate-400">{member.contactName}</p>
            </div>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px]">
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-slate-200">
              {member.category}
            </span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-slate-200">
              {member.city}
            </span>
            {member.owner && (
              <span className="rounded-full bg-gold-500/15 px-2 py-0.5 font-medium text-gold-300">
                Owner
              </span>
            )}
            {member.you && (
              <span className="rounded-full bg-info-500/15 px-2 py-0.5 font-medium text-info-300">
                You
              </span>
            )}
          </div>
          <p className="mt-2.5 flex items-center gap-1.5 border-t border-white/10 pt-2.5 text-[11px]">
            <span
              className={`size-2 rounded-full ${member.online ? "bg-emerald-400" : "bg-slate-500"}`}
            />
            <span className={member.online ? "text-emerald-300" : "text-slate-400"}>
              {member.online ? "Online now" : "Offline"}
            </span>
          </p>
        </NodePopover>
      )}
    </div>
  );
}
