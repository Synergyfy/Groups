import { useState } from "react";
import { Check, ChevronDown, Compass, ListChecks, RotateCcw } from "lucide-react";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import LinkButton from "../components/ui/LinkButton";
import { useJourney } from "./context";
import { useJourneyStatus } from "./selectors";

export default function StepBanner() {
  const status = useJourneyStatus();
  const { markDone, unmarkDone, startTour } = useJourney();
  const [showDetails, setShowDetails] = useState(false);

  const step = status.current;
  const isDone = status.done[step.id];

  return (
    <section
      data-tour="step-banner"
      aria-label="Your current journey step"
      className={`rounded-2xl border p-3 transition-colors sm:p-4 ${
        isDone
          ? "border-success-500/25 bg-success-500/[0.06]"
          : "border-gold-500/30 bg-gold-500/[0.07]"
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            isDone ? "bg-success-500/20 text-success-400" : "bg-gold-500/20 text-gold-200"
          }`}
        >
          Your story · Step {status.currentIndex + 1} of {status.total}
        </span>
        <span className="min-w-0 truncate text-[11px] font-semibold text-slate-400">
          {step.chapter}
        </span>
        {status.onThisStep && (
          <Badge variant={isDone ? "success" : "gold"}>
            {isDone ? "Done on this screen" : "You are in the right place"}
          </Badge>
        )}
        {status.allDone && <Badge variant="success">Story complete</Badge>}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="min-w-0 text-sm font-bold text-white">{step.title}</p>
        <LinkButton to={step.cta.to} size="md" className="shrink-0">
          <Compass className="size-4" /> {step.cta.label}
        </LinkButton>
      </div>

      <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
        <span className="font-semibold text-gold-300">Do this: </span>
        {step.instruction}
      </p>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <Button
          variant={isDone ? "secondary" : "outline"}
          size="md"
          onClick={() => (isDone ? unmarkDone(step.id) : markDone(step.id))}
        >
          {isDone ? <RotateCcw className="size-4" /> : <Check className="size-4" />}
          {isDone ? "Mark not done" : "I have done this"}
        </Button>
        <Button variant="ghost" size="md" onClick={() => startTour(status.tourId)}>
          Tour this screen
        </Button>
        <Button
          variant="ghost"
          size="md"
          aria-expanded={showDetails}
          onClick={() => setShowDetails((open) => !open)}
        >
          <ListChecks className="size-4" />
          Details
          <ChevronDown
            className={`size-4 transition-transform ${showDetails ? "rotate-180" : ""}`}
          />
        </Button>
      </div>

      {showDetails && (
        <div className="mt-2.5 flex flex-col gap-1.5 border-t border-white/10 pt-2.5">
          <p className="text-[11px] leading-relaxed text-slate-400">
            <span className="font-semibold text-slate-300">Why: </span>
            {step.why}
          </p>
          {status.note && (
            <p className="text-[11px] leading-relaxed text-slate-500">
              <span className="font-semibold text-slate-400">On this screen: </span>
              {status.note}
            </p>
          )}
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {step.how.length} steps for this chapter
          </p>
          <ol className="list-decimal space-y-1.5 pl-5 text-[11px] leading-relaxed text-slate-300">
            {step.how.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
