import type { ReactNode } from "react";

export type BadgeVariant =
  | "default"
  | "gold"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "muted";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: "bg-white/10 text-slate-200 border-white/15",
  gold: "bg-gold-500/15 text-gold-300 border-gold-500/30",
  success: "bg-success-500/15 text-success-400 border-success-500/30",
  warning: "bg-warning-500/15 text-warning-400 border-warning-500/30",
  danger: "bg-danger-500/15 text-danger-400 border-danger-500/30",
  info: "bg-info-500/15 text-info-400 border-info-500/30",
  muted: "bg-ink-800 text-slate-400 border-white/10",
};

export default function Badge({
  variant = "default",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
