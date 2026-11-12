import { useState } from "react";
import { Crown } from "lucide-react";
import type { CircleMember } from "../../domain/types";
import Avatar from "../../components/ui/Avatar";
import ProfilePreview from "./ProfilePreview";

interface MemberNodeProps {
  member: CircleMember;
  x: number;
  y: number;
  size: number;
  ring: "inner" | "outer";
  accent: string;
  onViewProfile: (member: CircleMember) => void;
  onSendMessage: (member: CircleMember) => void;
  onAddCategory: (member: CircleMember) => void;
}

export default function MemberNode({
  member,
  x,
  y,
  size,
  ring,
  accent,
  onViewProfile,
  onSendMessage,
  onAddCategory,
}: MemberNodeProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const inactive = member.status === "inactive";
  const banker = member.role === "banker";

  const ringClass = inactive
    ? "opacity-40 grayscale"
    : banker
      ? "ring-2 ring-gold-500"
      : ring === "inner"
        ? "ring-2"
        : "ring-1 ring-white/20";

  const glow = inactive
    ? undefined
    : banker
      ? "0 0 20px rgba(230, 169, 43, 0.45)"
      : ring === "inner"
        ? `0 0 14px ${accent}66`
        : undefined;

  return (
    <div
      className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 transition-[left,top,width,height] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:z-40 focus-within:z-40"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setHovered(false);
        }
      }}
    >
      <button
        type="button"
        ref={setAnchor}
        aria-label={`${member.businessName} — ${member.fullName}, ${member.category}`}
        className={`animate-node-in relative flex size-full cursor-pointer items-center justify-center rounded-full border border-white/10 text-[11px] font-bold text-white transition-transform duration-200 hover:scale-110 focus-visible:scale-110 focus-visible:outline-none ${ringClass}`}
        style={{ boxShadow: glow, ["--tw-ring-color" as string]: banker ? undefined : accent }}
      >
        <Avatar id={member.id} name={member.fullName} className="size-full rounded-full" />
        {banker && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-gold-500 text-ink-950 shadow-md shadow-black/40">
            <Crown className="size-2.5" />
          </span>
        )}
      </button>
      <ProfilePreview
        member={member}
        anchor={anchor}
        active={hovered}
        onViewProfile={onViewProfile}
        onSendMessage={onSendMessage}
        onAddCategory={onAddCategory}
      />
    </div>
  );
}
