import { Check } from "lucide-react";

export interface StepperStep {
  id: string;
  label: string;
}

interface StepperProps {
  steps: StepperStep[];
  current: number;
  onStepClick?: (index: number) => void;
}

export default function Stepper({ steps, current, onStepClick }: StepperProps) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        const clickable = onStepClick && index <= current;
        return (
          <li key={step.id} className="flex items-center gap-2">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => onStepClick?.(index)}
              className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                active
                  ? "border-gold-500/50 bg-gold-500/15 text-gold-200"
                  : done
                    ? "border-success-500/30 bg-success-500/10 text-success-400"
                    : "border-white/10 bg-ink-900/70 text-slate-500"
              } ${clickable ? "cursor-pointer" : "cursor-default"}`}
            >
              <span
                className={`flex size-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  active
                    ? "bg-gold-500 text-ink-950"
                    : done
                      ? "bg-success-500 text-ink-950"
                      : "bg-ink-800 text-slate-400"
                }`}
              >
                {done ? <Check className="size-3" strokeWidth={3} /> : index + 1}
              </span>
              {step.label}
            </button>
            {index < steps.length - 1 && (
              <span
                className={`h-px w-6 ${done ? "bg-success-500/40" : "bg-white/10"}`}
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
