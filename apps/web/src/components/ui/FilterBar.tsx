import type { ReactNode } from "react";
import Select, { type SelectOption } from "./Select";

interface FilterBarProps {
  children?: ReactNode;
}

export default function FilterBar({ children }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-white/10 bg-ink-900/70 p-3 sm:p-4">
      {children}
    </div>
  );
}

interface FilterSelectProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  tip?: string;
}

export function FilterSelect({ label, value, options, onChange, tip }: FilterSelectProps) {
  return (
    <Select
      label={label}
      value={value}
      options={options}
      onChange={(event) => onChange(event.target.value)}
      tip={tip}
      className="min-w-[9rem] flex-1 sm:flex-none"
    />
  );
}
