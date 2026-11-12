import { useState } from "react";
import {
  ScrollText,
  Building2,
  Settings,
  UserPlus,
  UserMinus,
  CheckCircle2,
  XCircle,
  PauseCircle,
  Archive,
  Trash2,
  Link2,
  Megaphone,
  Handshake,
  CircleDot,
} from "lucide-react";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import TipIcon from "../../components/ui/TipIcon";
import { useAuditLog } from "../../store/selectors";
import type { AuditActionKind, AuditLogEntry } from "../../domain/types";

const ACTION_META: Record<AuditActionKind, { label: string; color: string; icon: React.ReactNode }> = {
  "group-created": { label: "Group created", color: "bg-emerald-500/15 text-emerald-300", icon: <Building2 className="size-3" /> },
  "group-updated": { label: "Group updated", color: "bg-sky-500/15 text-sky-300", icon: <Settings className="size-3" /> },
  "group-approved": { label: "Group approved", color: "bg-emerald-500/15 text-emerald-300", icon: <CheckCircle2 className="size-3" /> },
  "group-suspended": { label: "Group suspended", color: "bg-warning-500/15 text-warning-300", icon: <PauseCircle className="size-3" /> },
  "group-closed": { label: "Group closed", color: "bg-slate-500/15 text-slate-300", icon: <Archive className="size-3" /> },
  "group-deleted": { label: "Group deleted", color: "bg-danger-500/15 text-danger-300", icon: <Trash2 className="size-3" /> },
  "member-added": { label: "Member added", color: "bg-emerald-500/15 text-emerald-300", icon: <UserPlus className="size-3" /> },
  "member-removed": { label: "Member removed", color: "bg-danger-500/15 text-danger-300", icon: <UserMinus className="size-3" /> },
  "invitation-approved": { label: "Invitation approved", color: "bg-emerald-500/15 text-emerald-300", icon: <CheckCircle2 className="size-3" /> },
  "invitation-declined": { label: "Invitation declined", color: "bg-danger-500/15 text-danger-300", icon: <XCircle className="size-3" /> },
  "invitation-cancelled": { label: "Invitation cancelled", color: "bg-slate-500/15 text-slate-300", icon: <XCircle className="size-3" /> },
  "config-updated": { label: "Config updated", color: "bg-gold-500/15 text-gold-300", icon: <Settings className="size-3" /> },
  "partner-updated": { label: "Partner updated", color: "bg-gold-500/15 text-gold-300", icon: <Handshake className="size-3" /> },
  "business-updated": { label: "Business updated", color: "bg-sky-500/15 text-sky-300", icon: <Building2 className="size-3" /> },
  "programme-updated": { label: "Programme updated", color: "bg-sky-500/15 text-sky-300", icon: <ScrollText className="size-3" /> },
  "campaign-updated": { label: "Campaign updated", color: "bg-sky-500/15 text-sky-300", icon: <Megaphone className="size-3" /> },
  "relationship-assigned": { label: "Relationship assigned", color: "bg-sky-500/15 text-sky-300", icon: <Link2 className="size-3" /> },
  "circle-type-created": { label: "Circle type created", color: "bg-emerald-500/15 text-emerald-300", icon: <CircleDot className="size-3" /> },
  "circle-type-updated": { label: "Circle type updated", color: "bg-sky-500/15 text-sky-300", icon: <CircleDot className="size-3" /> },
  "circle-type-deleted": { label: "Circle type deleted", color: "bg-danger-500/15 text-danger-300", icon: <Trash2 className="size-3" /> },
  "content-published": { label: "Content published", color: "bg-gold-500/15 text-gold-300", icon: <Megaphone className="size-3" /> },
};

const TARGET_COLORS: Record<string, string> = {
  group: "bg-sky-500/10 text-sky-400",
  member: "bg-emerald-500/10 text-emerald-400",
  invitation: "bg-gold-500/10 text-gold-400",
  config: "bg-slate-500/10 text-slate-400",
  partner: "bg-gold-500/10 text-gold-400",
  business: "bg-sky-500/10 text-sky-400",
  programme: "bg-sky-500/10 text-sky-400",
  campaign: "bg-sky-500/10 text-sky-400",
  content: "bg-gold-500/10 text-gold-400",
  "circle-type": "bg-gold-500/10 text-gold-400",
};

export default function AdminAuditLogPage() {
  const auditLog = useAuditLog();
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all" ? auditLog : auditLog.filter((e) => e.action === filter);

  const actionCounts = auditLog.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.action] = (acc[entry.action] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="Audit Log"
        tip="Append-only. Entries are written automatically by the platform — they cannot be edited or removed from here."
        subtitle="Every administrative action recorded on the platform — who did what, when, and to which target. Newest first."
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Total entries" value={String(auditLog.length)} hint="All recorded actions" accent="gold" />
        <StatCard label="Group actions" value={String(auditLog.filter((e) => e.targetType === "group").length)} hint="Targeting groups" accent="info" />
        <StatCard label="Member actions" value={String(auditLog.filter((e) => e.targetType === "member").length)} hint="Targeting members" accent="success" />
        <StatCard label="Config changes" value={String(auditLog.filter((e) => e.targetType === "config").length)} hint="Configuration edits" accent="warning" />
      </div>

      {/* Filter */}
      <Card>
        <CardBody className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5">
            <CardTitle>Filter by action</CardTitle>
            <TipIcon text="Chips only appear once that action has actually happened, so the filter always reflects real activity." />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip label="All" active={filter === "all"} onClick={() => setFilter("all")} count={auditLog.length} />
            {Object.entries(actionCounts).map(([action, count]) => (
              <FilterChip
                key={action}
                label={ACTION_META[action as AuditActionKind]?.label ?? action}
                active={filter === action}
                onClick={() => setFilter(action)}
                count={count}
              />
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Log */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-ink-900/40 p-10 text-center">
          <ScrollText className="mx-auto size-8 text-slate-600" />
          <p className="mt-3 text-sm font-medium text-slate-400">No audit entries yet</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
            Administrative actions such as approving groups, editing settings, or managing members will appear here.
          </p>
        </div>
      ) : (
        <Card>
          <CardBody className="flex flex-col gap-0 p-0">
            <ul className="divide-y divide-white/5">
              {filtered.map((entry) => (
                <AuditRow key={entry.id} entry={entry} />
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function AuditRow({ entry }: { entry: AuditLogEntry }) {
  const meta = ACTION_META[entry.action] ?? { label: entry.action, color: "bg-slate-500/15 text-slate-300", icon: <ScrollText className="size-3" /> };
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${meta.color}`}>
        {meta.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-white">{meta.label}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">{entry.detail}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
          <span>By {entry.actorName}</span>
          <span>·</span>
          <span>{new Date(entry.at).toLocaleString("en-GB")}</span>
          <span className={`rounded-full px-1.5 py-0.5 ${TARGET_COLORS[entry.targetType] ?? "bg-slate-500/10 text-slate-400"}`}>
            {entry.targetType}
          </span>
        </div>
      </div>
    </li>
  );
}

function FilterChip({ label, active, onClick, count }: { label: string; active: boolean; onClick: () => void; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
        active
          ? "border-gold-500/40 bg-gold-500/15 text-gold-200"
          : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200"
      }`}
    >
      {label}
      <span className={`text-[10px] ${active ? "text-gold-400" : "text-slate-500"}`}>{count}</span>
    </button>
  );
}
