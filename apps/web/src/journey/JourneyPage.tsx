import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Check, RotateCcw } from "lucide-react";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import SectionHeader from "../components/ui/SectionHeader";
import { routeNote } from "./routes";
import { findTour } from "./tours";
import { useJourney } from "./context";
import { useJourneyStatus } from "./selectors";

export default function JourneyPage() {
  const status = useJourneyStatus();
  const { markDone, unmarkDone, resetJourney, startTour, manual } = useJourney();

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title={status.scope === "admin" ? "Admin journey" : "Your journey"}
        subtitle={
          status.scope === "admin"
            ? "The same platform, told from the administrator's side: see everything, set the rules everyone lives by, then prove it works."
            : "The platform as a story — each chapter is one job you need to do, in order. Steps tick themselves off as you visit screens and as your demo state changes; you can always override them by hand."
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-ink-900/70 p-3.5 sm:p-4">
          <p className="truncate text-xs font-medium text-slate-400">Story progress</p>
          <p className="mt-1.5 text-2xl font-bold leading-none text-white">
            {status.doneCount} / {status.total}
          </p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-ink-800">
            <div
              className="h-full rounded-full bg-gold-500 transition-[width] duration-500"
              style={{ width: `${status.percent}%` }}
            />
          </div>
          <p className="mt-2 truncate text-[11px] text-slate-500">{status.percent}% complete</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-ink-900/70 p-3.5 sm:p-4">
          <p className="truncate text-xs font-medium text-slate-400">Current chapter</p>
          <p className="mt-1.5 text-sm font-semibold leading-snug text-white">
            {status.current.chapter}
          </p>
          <p className="mt-1 truncate text-[11px] text-slate-500">
            Step {status.currentIndex + 1} of {status.total}
          </p>
        </div>
        <div className="col-span-2 flex flex-col justify-between rounded-2xl border border-gold-500/30 bg-gold-500/[0.07] p-3.5 sm:col-span-1 sm:p-4">
          <div>
            <p className="truncate text-xs font-medium text-gold-200">Do this next</p>
            <p className="mt-1.5 text-sm font-semibold leading-snug text-white">
              {status.allDone ? "Review the story any time" : status.current.title}
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {!status.allDone && (
              <Link
                to={status.current.cta.to}
                className="inline-flex flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-ink-950 transition-colors hover:bg-gold-400 sm:flex-none"
              >
                {status.current.cta.label} <ArrowRight className="size-3.5" />
              </Link>
            )}
            <Button variant="ghost" size="sm" onClick={resetJourney}>
              <RotateCcw className="size-3.5" /> Reset journey
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {status.steps.map((step, index) => {
          const isDone = status.done[step.id];
          const isCurrent = index === status.currentIndex;
          const showChapter =
            index === 0 || status.steps[index - 1].chapter !== step.chapter;
          const note = routeNote(step.route);

          return (
            <div key={step.id}>
              {showChapter && (
                <p className="mb-2 mt-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 first:mt-0">
                  <BookOpen className="size-3.5 text-gold-400" />
                  {step.chapter}
                </p>
              )}
              <article
                className={`rounded-2xl border p-4 transition-colors ${
                  isCurrent
                    ? "border-gold-500/40 bg-gold-500/[0.07]"
                    : isDone
                      ? "border-success-500/20 bg-ink-900/60"
                      : "border-white/10 bg-ink-900/60"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                          isDone
                            ? "bg-success-500 text-ink-950"
                            : isCurrent
                              ? "bg-gold-500 text-ink-950"
                              : "bg-ink-800 text-slate-400"
                        }`}
                      >
                        {isDone ? <Check className="size-3.5" strokeWidth={3} /> : index + 1}
                      </span>
                      <h2 className="text-sm font-bold text-white">{step.title}</h2>
                      <Badge variant={isDone ? "success" : isCurrent ? "gold" : "muted"}>
                        {isDone ? "Done" : isCurrent ? "Current step" : "Upcoming"}
                      </Badge>
                      {manual.includes(step.id) && <Badge variant="info">Marked by you</Badge>}
                    </div>

                    <p className="mt-2 text-xs leading-relaxed text-slate-300">
                      <span className="font-semibold text-gold-300">Do this: </span>
                      {step.instruction}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                      <span className="font-semibold text-slate-300">Why: </span>
                      {step.why}
                    </p>

                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-[11px] leading-relaxed text-slate-400">
                      {step.how.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ol>

                    {note && (
                      <p className="mt-2 text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-400">Where: </span>
                        {note}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col gap-2 sm:w-44">
                    <Link
                      to={step.cta.to}
                      className="inline-flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-gold-500 px-3 py-2 text-xs font-semibold text-ink-950 transition-colors hover:bg-gold-400 sm:w-auto sm:py-1.5"
                    >
                      {step.cta.label} <ArrowRight className="size-3.5" />
                    </Link>
                    <div className="flex gap-2 sm:flex-col">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 sm:flex-none"
                        onClick={() => startTour(findTour(step.route).id)}
                      >
                        Tour that screen
                      </Button>
                      <Button
                        variant={isDone ? "secondary" : "outline"}
                        size="sm"
                        className="flex-1 sm:flex-none"
                        onClick={() => (isDone ? unmarkDone(step.id) : markDone(step.id))}
                      >
                        {isDone ? (
                          <RotateCcw className="size-3.5" />
                        ) : (
                          <Check className="size-3.5" />
                        )}
                        {isDone ? "Mark not done" : "Mark done"}
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] leading-relaxed text-slate-500">
        Steps complete automatically from the demo store (memberships, groups, invitations,
        thresholds) and from the screens you visit. “Mark done” overrides anything that cannot be
        detected — and “Mark not done” puts a step back so you can replay it.
      </p>
    </div>
  );
}
