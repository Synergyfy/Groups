import { useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface CollapsibleCardProps {
  title: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  action?: ReactNode;
  defaultOpen?: boolean;
  "data-tour"?: string;
}

export default function CollapsibleCard({
  title,
  children,
  className = "",
  bodyClassName = "",
  action,
  defaultOpen = true,
  "data-tour": dataTour,
}: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      data-tour={dataTour}
      className={`rounded-2xl border border-white/10 bg-ink-900/70 ${className}`}
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
        <button
          type="button"
          data-collapsible="true"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="-mx-1 flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-0.5 text-left transition-colors hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-gold-500"
        >
          <h3 className="truncate text-sm font-semibold text-white">{title}</h3>
          <ChevronDown
            aria-hidden="true"
            className={`size-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>
      {open && (
        <div className={`px-4 pb-4 pt-3 sm:px-5 sm:pb-5 ${bodyClassName}`}>{children}</div>
      )}
    </section>
  );
}
