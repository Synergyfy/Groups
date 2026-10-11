import { Info } from "lucide-react";

interface TipIconProps {
  text: string;
  className?: string;
}

export default function TipIcon({ text, className = "" }: TipIconProps) {
  return (
    <span
      tabIndex={0}
      aria-label={text}
      className={`group/tip relative inline-flex cursor-help items-center rounded-full outline-none ${className}`}
    >
      <Info className="size-3.5 shrink-0 text-slate-500 transition-colors group-hover/tip:text-gold-300 group-focus-visible/tip:text-gold-300" />
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-40 mt-1.5 w-44 -translate-x-1/2 rounded-lg border border-white/10 bg-ink-950 px-2.5 py-2 text-[10px] leading-snug text-slate-300 opacity-0 shadow-xl shadow-black/50 transition-opacity duration-150 group-hover/tip:opacity-100 group-focus-visible/tip:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}
