import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type LinkVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type LinkSize = "sm" | "md" | "lg";

interface LinkButtonProps {
  to: string;
  state?: unknown;
  variant?: LinkVariant;
  size?: LinkSize;
  className?: string;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<LinkVariant, string> = {
  primary:
    "bg-gold-500 text-ink-950 hover:bg-gold-400 active:bg-gold-600 font-semibold shadow-lg shadow-gold-500/10",
  secondary:
    "bg-ink-800 border border-white/10 text-slate-200 hover:bg-ink-700 hover:border-white/20",
  outline:
    "border border-gold-500/40 text-gold-200 hover:bg-gold-500/10 hover:border-gold-500/60",
  ghost: "text-slate-300 hover:bg-white/5 hover:text-white",
  danger:
    "bg-danger-500/15 border border-danger-500/30 text-danger-400 hover:bg-danger-500/25",
};

const SIZE_CLASSES: Record<LinkSize, string> = {
  sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
  md: "h-10 px-4 text-sm rounded-xl gap-2",
  lg: "h-11 px-5 text-sm rounded-xl gap-2",
};

export default function LinkButton({
  to,
  state,
  variant = "primary",
  size = "md",
  className = "",
  children,
}: LinkButtonProps) {
  return (
    <Link
      to={to}
      state={state}
      className={`inline-flex cursor-pointer items-center justify-center whitespace-nowrap transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
    >
      {children}
    </Link>
  );
}
