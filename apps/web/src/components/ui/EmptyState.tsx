import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export default function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-ink-900/50 px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-ink-800 text-gold-400">
        {icon ?? <Inbox className="size-6" />}
      </div>
      <div className="max-w-sm">
        <p className="text-sm font-semibold text-white">{title}</p>
        {description && <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
