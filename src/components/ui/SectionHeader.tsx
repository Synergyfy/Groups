import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  back?: string;
  backLabel?: string;
}

export default function SectionHeader({
  title,
  subtitle,
  actions,
  back,
  backLabel = "Back",
}: SectionHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {back && (
          <Link
            to={back}
            className="mb-1.5 inline-flex min-h-10 items-center gap-1 rounded-lg pr-2 text-xs font-medium text-slate-400 transition-colors hover:text-gold-300 focus-visible:outline-2 focus-visible:outline-gold-500"
          >
            <ChevronLeft className="size-4" />
            {backLabel}
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-bold text-white sm:text-xl">{title}</h1>
        </div>
        {subtitle && (
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400 sm:text-sm">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
