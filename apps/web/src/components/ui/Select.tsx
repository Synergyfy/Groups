import type { SelectHTMLAttributes } from "react";
import TipIcon from "./TipIcon";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  hint?: string;
  tip?: string;
}

export default function Select({
  label,
  options,
  hint,
  tip,
  className = "",
  ...rest
}: SelectProps) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
          {label}
          {tip && <TipIcon text={tip} />}
        </span>
      )}
      <select
        className="h-10 cursor-pointer appearance-none rounded-lg border border-white/10 bg-ink-800 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.6rem_center] bg-no-repeat px-3 pr-8 text-xs text-slate-200 outline-none transition-colors hover:border-white/20 focus:border-gold-500/50 [&>option]:bg-ink-800"
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && <span className="block text-[10px] leading-snug text-slate-500">{hint}</span>}
    </label>
  );
}
