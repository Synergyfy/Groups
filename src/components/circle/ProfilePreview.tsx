import { Eye, MessageSquare, Tag } from "lucide-react";
import type { CircleMember } from "../../domain/types";
import Avatar from "../../components/ui/Avatar";
import NodePopover from "../ui/NodePopover";

interface ProfilePreviewProps {
  member: CircleMember;
  anchor: HTMLElement | null;
  active: boolean;
  onViewProfile: (member: CircleMember) => void;
  onSendMessage: (member: CircleMember) => void;
  onAddCategory: (member: CircleMember) => void;
}

export default function ProfilePreview({
  member,
  anchor,
  active,
  onViewProfile,
  onSendMessage,
  onAddCategory,
}: ProfilePreviewProps) {
  return (
    <NodePopover
      anchor={anchor}
      active={active}
      width={224}
      className="z-40 rounded-xl border border-white/10 bg-ink-850/95 p-3 shadow-2xl shadow-black/60 backdrop-blur-sm opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto"
    >
      <div className="flex items-center gap-2.5">
        <Avatar
          id={member.id}
          name={member.fullName}
          className="size-10 shrink-0 rounded-full text-xs font-bold text-white"
        />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-white">
            {member.businessName}
          </span>
          <span className="block truncate text-xs text-slate-400">{member.fullName}</span>
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-slate-200">
          {member.category}
        </span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-slate-200">
          {member.location}
        </span>
        <span className="rounded-full bg-gold-500/15 px-2 py-0.5 font-medium text-gold-300">
          {member.tier}
        </span>
        <span
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
            member.status === "active"
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-slate-500/15 text-slate-400"
          }`}
        >
          <span
            className={`size-1.5 rounded-full ${
              member.status === "active" ? "bg-emerald-400" : "bg-slate-500"
            }`}
          />
          {member.status}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5 border-t border-white/10 pt-2.5">
        <button
          type="button"
          onClick={() => onViewProfile(member)}
          className="flex flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Eye className="size-3.5" />
          View Profile
        </button>
        <button
          type="button"
          onClick={() => onSendMessage(member)}
          className="flex flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <MessageSquare className="size-3.5" />
          Message
        </button>
        <button
          type="button"
          onClick={() => onAddCategory(member)}
          className="flex flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Tag className="size-3.5" />
          Add Category
        </button>
      </div>
    </NodePopover>
  );
}
