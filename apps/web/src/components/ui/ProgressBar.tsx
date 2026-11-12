interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  accent?: string;
}

export default function ProgressBar({
  value,
  max,
  label,
  accent = "#e6a92b",
}: ProgressBarProps) {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.min(100, Math.max(0, (value / safeMax) * 100));
  const complete = value >= max;

  return (
    <div className="w-full">
      {label && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-slate-400">{label}</span>
          <span className="font-semibold text-white">
            {value} / {max}
          </span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className="h-2 w-full overflow-hidden rounded-full bg-ink-800"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${
            complete ? "bg-success-500" : ""
          }`}
          style={{ width: `${pct}%`, backgroundColor: complete ? undefined : accent }}
        />
      </div>
    </div>
  );
}
