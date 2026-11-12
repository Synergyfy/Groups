import { useMemo, useState } from "react";
import {
  Crown,
  Mail,
  Sparkles,
  UserMinus,
} from "lucide-react";
import Avatar from "../../components/ui/Avatar";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody } from "../../components/ui/Card";
import NodePopover from "../../components/ui/NodePopover";
import Toast from "../../components/ui/Toast";
import { findDirectoryEntry } from "../../data/businessData";
import { isOnline } from "../../lib/presence";
import type { Group } from "../../domain/types";

interface CircleNodeData {
  id: string;
  name: string;
  contactName: string;
  category: string;
  city: string;
  role: "Owner" | "Member";
  isOwner: boolean;
  online: boolean;
  contributionStatus: "paid" | "pending" | "overdue";
  amount: number;
}

const INNER_RADIUS_PCT = 34;
const OUTER_RADIUS_PCT = 44;

function calculatePositions(count: number, radiusPct: number) {
  if (count <= 0) return [];
  return Array.from({ length: count }, (_, i) => {
    const angle = ((360 / count) * i - 90) * (Math.PI / 180);
    return {
      x: 50 + radiusPct * Math.cos(angle),
      y: 50 + radiusPct * Math.sin(angle),
    };
  });
}

export default function AdminGroupCircleVisualization({
  group,
  onRemoveMember,
}: {
  group: Group;
  onRemoveMember?: (memberId: string, memberName: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [centerOpen, setCenterOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<"all" | "paid" | "pending" | "online">("all");
  const [centerAnchor, setCenterAnchor] = useState<HTMLElement | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const isPaidGroup = group.pricing === "paid";
  const amount = group.contribution ?? 0;

  // Build members list with owner at index 0
  const allMembers: CircleNodeData[] = useMemo(() => {
    const ids = [...new Set([group.ownerId, ...group.memberIds])].filter((id) => id !== "system");
    return ids.map((id, index) => {
      const entry = findDirectoryEntry(id);
      const isOwner = id === group.ownerId;
      let contributionStatus: "paid" | "pending" | "overdue" = "paid";
      if (!isOwner && index % 4 === 1) contributionStatus = "pending";
      else if (!isOwner && index % 7 === 0) contributionStatus = "overdue";

      return {
        id,
        name: entry.name,
        contactName: entry.contactName,
        category: entry.category,
        city: entry.city,
        role: isOwner ? "Owner" : "Member",
        isOwner,
        online: isOwner || isOnline(id),
        contributionStatus,
        amount,
      };
    });
  }, [group, amount]);

  const owner = allMembers.find((m) => m.isOwner) || allMembers[0];
  const satellites = useMemo(
    () => allMembers.filter((m) => !m.isOwner),
    [allMembers]
  );

  const filteredSatellites = useMemo(() => {
    return satellites.filter((m) => {
      if (filterMode === "paid") return m.contributionStatus === "paid";
      if (filterMode === "pending") return m.contributionStatus !== "paid";
      if (filterMode === "online") return m.online;
      return true;
    });
  }, [satellites, filterMode]);

  const count = filteredSatellites.length;
  // If count is large, split into inner and outer orbital rings
  const useTwoRings = count > 12;
  const innerCount = useTwoRings ? Math.ceil(count * 0.45) : count;
  const outerCount = useTwoRings ? count - innerCount : 0;

  const innerPositions = calculatePositions(innerCount, useTwoRings ? INNER_RADIUS_PCT : 38);
  const outerPositions = calculatePositions(outerCount, OUTER_RADIUS_PCT);

  const selectedMember = allMembers.find((m) => m.id === selectedId) ?? null;

  const handleToggle = (id: string) => {
    setCenterOpen(false);
    setSelectedId((current) => (current === id ? null : id));
  };

  const handleCenterToggle = () => {
    setSelectedId(null);
    setCenterOpen((prev) => !prev);
  };

  const paidCount = allMembers.filter((m) => m.contributionStatus === "paid").length;
  const onlineCount = allMembers.filter((m) => m.online).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Control bar / Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-ink-900/80 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-white flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-gold-400" /> Circle Network View:
          </span>
          <span className="text-xs text-slate-400">
            Owner at the center with orbital members and live contribution status
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 mr-1">Filter:</span>
          {(
            [
              { id: "all", label: `All (${satellites.length})` },
              ...(isPaidGroup
                ? [
                    { id: "paid", label: `Paid (${paidCount})` },
                    { id: "pending", label: `Pending/Overdue (${satellites.length - paidCount + 1})` },
                  ]
                : []),
              { id: "online", label: `Online (${onlineCount})` },
            ] as const
          ).map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => setFilterMode(btn.id as any)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                filterMode === btn.id
                  ? "bg-gold-500/20 text-gold-300 border border-gold-500/40"
                  : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Circle Canvas */}
      <div className="relative mx-auto aspect-square w-full max-w-[560px] select-none rounded-2xl border border-white/10 bg-gradient-to-b from-ink-900/90 via-ink-950 to-ink-950 p-4 shadow-2xl overflow-hidden">
        {/* Orbital circles in background */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute inset-[10%] rounded-full border border-dashed border-white/10 animate-spin-slow opacity-60" />
          <div className="absolute inset-[24%] rounded-full border border-white/10" />
          <div className="absolute inset-[38%] rounded-full border border-dashed border-gold-500/20" />
          <div className="absolute left-1/2 top-1/2 size-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(230,169,43,0.18)_0%,transparent_70%)]" />
        </div>

        {/* SVG Connector Lines from Center to each Satellite */}
        <svg
          className="absolute inset-0 size-full pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {filteredSatellites.map((member, i) => {
            const isInner = i < innerPositions.length;
            const pos = isInner ? innerPositions[i] : outerPositions[i - innerPositions.length];
            if (!pos) return null;
            const isSelected = selectedId === member.id;
            return (
              <line
                key={`line-${member.id}`}
                x1="50%"
                y1="50%"
                x2={`${pos.x}%`}
                y2={`${pos.y}%`}
                stroke={
                  isSelected
                    ? "#e6a92b"
                    : member.contributionStatus === "paid"
                    ? "rgba(52, 211, 153, 0.25)"
                    : member.contributionStatus === "overdue"
                    ? "rgba(244, 63, 94, 0.3)"
                    : "rgba(255, 255, 255, 0.12)"
                }
                strokeWidth={isSelected ? "2" : "1"}
                strokeDasharray={isSelected ? undefined : "3 3"}
              />
            );
          })}
        </svg>

        {/* CENTER NODE — GROUP OWNER */}
        {owner && (
          <div className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <button
              type="button"
              ref={setCenterAnchor}
              onClick={handleCenterToggle}
              className="group relative flex size-16 cursor-pointer items-center justify-center rounded-full ring-4 ring-gold-400 bg-ink-900 shadow-[0_0_35px_rgba(230,169,43,0.45)] transition-transform duration-200 hover:scale-110 focus:outline-none"
              title={`${owner.name} — Group Owner at Center`}
            >
              <Avatar
                id={owner.id}
                name={owner.name}
                className="size-full rounded-full text-sm font-bold text-white"
              />
              <span className="absolute -top-1.5 -right-1 flex size-5 items-center justify-center rounded-full bg-gold-500 text-ink-950 font-bold shadow-md ring-2 ring-ink-950">
                <Crown className="size-3" />
              </span>
            </button>

            <span className="mt-1.5 max-w-[130px] truncate rounded-full border border-gold-500/40 bg-ink-900/90 px-2 py-0.5 text-[10px] font-bold text-gold-300 shadow-md">
              👑 {owner.name}
            </span>
            <span className="text-[9px] font-semibold text-gold-400/90 tracking-wide uppercase mt-0.5">
              Owner & Organizer
            </span>

            {centerOpen && (
              <NodePopover
                anchor={centerAnchor}
                active={centerOpen}
                width={240}
                className="z-[80] rounded-xl border border-gold-500/30 bg-ink-900/95 p-3.5 text-left shadow-2xl shadow-black/80 backdrop-blur-md"
              >
                <div className="flex items-center gap-2.5">
                  <Avatar id={owner.id} name={owner.name} className="size-10 rounded-full text-sm font-bold" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">{owner.name}</p>
                    <p className="text-xs text-gold-300 font-medium">Group Owner & Creator</p>
                  </div>
                </div>
                <div className="mt-2.5 space-y-1 border-t border-white/10 pt-2 text-xs">
                  <p className="flex justify-between text-slate-300">
                    <span className="text-slate-500">Contact:</span>
                    <span>{owner.contactName}</span>
                  </p>
                  <p className="flex justify-between text-slate-300">
                    <span className="text-slate-500">Location:</span>
                    <span>{owner.city}</span>
                  </p>
                  <p className="flex justify-between text-slate-300">
                    <span className="text-slate-500">Sector:</span>
                    <span>{owner.category}</span>
                  </p>
                  <p className="flex justify-between text-slate-300">
                    <span className="text-slate-500">Members under owner:</span>
                    <span className="font-bold text-white">{allMembers.length}</span>
                  </p>
                </div>
              </NodePopover>
            )}
          </div>
        )}

        {/* ORBITING SATELLITE MEMBERS */}
        {filteredSatellites.map((member, i) => {
          const isInner = i < innerPositions.length;
          const pos = isInner ? innerPositions[i] : outerPositions[i - innerPositions.length];
          if (!pos) return null;
          const isSelected = selectedId === member.id;

          return (
            <div
              key={member.id}
              className={`absolute -translate-x-1/2 -translate-y-1/2 ${
                isSelected ? "z-40" : "z-20"
              }`}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            >
              <button
                type="button"
                onClick={() => handleToggle(member.id)}
                className={`relative flex size-10 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-ink-800 text-xs font-bold text-white shadow-lg transition-transform duration-200 hover:scale-115 focus:outline-none ${
                  isSelected
                    ? "ring-2 ring-gold-400 scale-110"
                    : member.contributionStatus === "paid"
                    ? "ring-1 ring-emerald-500/70"
                    : member.contributionStatus === "overdue"
                    ? "ring-1 ring-rose-500"
                    : "ring-1 ring-amber-500/60"
                }`}
                title={`${member.name} (${member.contactName})`}
              >
                <Avatar id={member.id} name={member.name} className="size-full rounded-full" />

                {/* Online indicator */}
                {member.online && (
                  <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-400 ring-2 ring-ink-950" />
                )}

                {/* Contribution Status Badge Dot */}
                {isPaidGroup && (
                  <span
                    className={`absolute -bottom-1 -right-0.5 flex size-3.5 items-center justify-center rounded-full text-[8px] font-bold text-white ring-1 ring-ink-950 ${
                      member.contributionStatus === "paid"
                        ? "bg-emerald-500"
                        : member.contributionStatus === "pending"
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                    title={`Contribution: ${member.contributionStatus}`}
                  >
                    {member.contributionStatus === "paid"
                      ? "✓"
                      : member.contributionStatus === "pending"
                      ? "•"
                      : "!"}
                  </span>
                )}
              </button>

              <span className="mt-1 max-w-[85px] block truncate text-center text-[9px] font-medium text-slate-300">
                {member.name.split(" ")[0]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Selected Member Detail Panel */}
      {selectedMember && (
        <Card className="border border-gold-500/30 bg-ink-900/90">
          <CardBody className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <Avatar
                id={selectedMember.id}
                name={selectedMember.name}
                className="size-12 rounded-full font-bold text-base ring-2 ring-gold-400/50"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">{selectedMember.name}</h4>
                  <Badge variant={selectedMember.isOwner ? "gold" : "default"}>
                    {selectedMember.role}
                  </Badge>
                  {isPaidGroup && (
                    <Badge
                      variant={
                        selectedMember.contributionStatus === "paid"
                          ? "success"
                          : selectedMember.contributionStatus === "pending"
                          ? "warning"
                          : "danger"
                      }
                    >
                      {selectedMember.contributionStatus === "paid"
                        ? `Paid · £${selectedMember.amount}`
                        : selectedMember.contributionStatus === "pending"
                        ? `Pending · £${selectedMember.amount}`
                        : `Overdue · £${selectedMember.amount}`}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedMember.contactName} · {selectedMember.category} · {selectedMember.city}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFeedback(`Opened message thread with ${selectedMember.name}`);
                }}
              >
                <Mail className="size-3.5" /> Message
              </Button>

              {!selectedMember.isOwner && onRemoveMember && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRemoveMember(selectedMember.id, selectedMember.name)}
                  className="text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                >
                  <UserMinus className="size-3.5" /> Remove from Group
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Legend Footer */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-gold-400 ring-2 ring-gold-400/30" />
          👑 Center Owner
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-emerald-400" />
          Paid Member (Settled)
        </span>
        {isPaidGroup && (
          <>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-amber-400" />
              Pending Payment
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-rose-500" />
              Overdue Payment
            </span>
          </>
        )}
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-400 ring-2 ring-ink-900" />
          Online Now
        </span>
      </div>

      {feedback && <Toast message={feedback} onDismiss={() => setFeedback(null)} />}
    </div>
  );
}
