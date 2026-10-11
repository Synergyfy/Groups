import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  accent?: "gold" | "success" | "warning" | "danger" | "info";
}

const ACCENT_DOT: Record<NonNullable<StatCardProps["accent"]>, string> = {
  gold: "bg-gold-500",
  success: "bg-success-500",
  warning: "bg-warning-500",
  danger: "bg-danger-500",
  info: "bg-info-500",
};

export default function StatCard({
  label,
  value,
  hint,
  icon,
  accent = "gold",
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-ink-900/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-400">{label}</p>
          <p className="mt-1.5 text-2xl font-bold leading-none text-white">{value}</p>
        </div>
        {icon && (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-ink-800 text-gold-400">
            {icon}
          </div>
        )}
      </div>
      {(hint || icon) && (
        <div className="mt-3 flex items-center gap-1.5">
          <span className={`size-1.5 rounded-full ${ACCENT_DOT[accent]}`} />
          <p className="truncate text-[11px] text-slate-500">{hint}</p>
        </div>
      )}
    </div>
  );
}
