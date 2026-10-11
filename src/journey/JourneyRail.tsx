import { Link } from "react-router-dom";
import { BookOpen, RotateCcw } from "lucide-react";
import { useJourney } from "./context";
import { useJourneyStatus } from "./selectors";

export default function JourneyRail() {
  const status = useJourneyStatus();
  const { resetJourney } = useJourney();

  return (
    <div className="border-t border-white/10 p-3" data-tour="journey-rail">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Your journey
        </p>
        <span className="text-[10px] font-semibold text-gold-300">
          {status.doneCount}/{status.total}
        </span>
      </div>

      <div
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-800"
        role="progressbar"
        aria-valuenow={status.doneCount}
        aria-valuemin={0}
        aria-valuemax={status.total}
        aria-label="Journey progress"
      >
        <div
          className="h-full rounded-full bg-gold-500 transition-[width] duration-500"
          style={{ width: `${status.percent}%` }}
        />
      </div>

      <Link
        to={status.journeyPath}
        className="mt-2.5 block rounded-xl border border-white/10 bg-ink-950/60 p-2.5 transition-colors hover:border-gold-500/40"
      >
        <p className="text-[10px] uppercase tracking-wide text-slate-500">
          Step {status.currentIndex + 1} of {status.total}
        </p>
        <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-snug text-white">
          {status.allDone ? "Story complete — review it any time" : status.current.title}
        </p>
      </Link>

      <div className="mt-2 flex items-center justify-between gap-2">
        <Link
          to={status.journeyPath}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gold-300 transition-colors hover:text-gold-200"
        >
          <BookOpen className="size-3.5" /> Open full story
        </Link>
        <button
          type="button"
          onClick={resetJourney}
          title="Reset visited screens, manual marks and seen tours"
          className="inline-flex cursor-pointer items-center gap-1 text-[10px] text-slate-500 transition-colors hover:text-slate-300"
        >
          <RotateCcw className="size-3" /> Reset
        </button>
      </div>
    </div>
  );
}
