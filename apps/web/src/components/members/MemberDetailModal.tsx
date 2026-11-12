import { CalendarDays, MapPin, Tag, User } from "lucide-react";
import type { ReactNode } from "react";
import Avatar from "../ui/Avatar";
import Badge from "../ui/Badge";
import Modal from "../ui/Modal";
import type { MemberSearchItem } from "./MemberSearch";

interface MemberDetailModalProps {
  member: MemberSearchItem | null;
  onClose: () => void;
}

export default function MemberDetailModal({ member, onClose }: MemberDetailModalProps) {
  if (!member) return null;

  const facts: { label: string; value: string; icon: ReactNode }[] = [
    { label: "Contact", value: member.contactName, icon: <User className="size-3.5" /> },
    { label: "Category", value: member.category, icon: <Tag className="size-3.5" /> },
    { label: "City", value: member.city, icon: <MapPin className="size-3.5" /> },
    ...(member.joinedAt
      ? [
          {
            label: "Joined",
            value: member.joinedAt,
            icon: <CalendarDays className="size-3.5" />,
          },
        ]
      : []),
  ];

  const role = member.isOwner ? "Owner" : member.isSelf ? "Member (you)" : "Member";

  return (
    <Modal open title="Member details" onClose={onClose}>
      <div className="flex items-center gap-3.5">
        <Avatar
          id={member.id}
          name={member.name}
          className="size-14 shrink-0 rounded-full text-base font-bold text-white"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{member.name}</p>
          <p className="truncate text-xs text-slate-400">{member.contactName}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge variant={member.isOwner ? "gold" : member.isSelf ? "info" : "default"}>
              {role}
            </Badge>
            <Badge variant={member.online ? "success" : "muted"}>
              {member.online ? "Online" : "Offline"}
            </Badge>
          </div>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {facts.map((fact) => (
          <div
            key={fact.label}
            className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5"
          >
            <span className="mt-0.5 text-gold-500">{fact.icon}</span>
            <div className="min-w-0">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {fact.label}
              </dt>
              <dd className="truncate text-xs font-medium text-slate-200">{fact.value}</dd>
            </div>
          </div>
        ))}
      </dl>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        Member records come from the shared business directory — the same identity used
        across National Community, city relationships and campaign participation.
      </p>
    </Modal>
  );
}
