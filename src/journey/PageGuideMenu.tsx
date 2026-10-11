import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BookOpen, X } from "lucide-react";
import Button from "../components/ui/Button";
import { useJourney } from "./context";
import { useJourneyStatus } from "./selectors";
import { routeNote } from "./routes";
import { findTour } from "./tours";

export default function PageGuideMenu() {
  const location = useLocation();
  const status = useJourneyStatus();
  const { startTour, activeTour, seenTours } = useJourney();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const tour = findTour(location.pathname);
  const isActive = activeTour === tour.id;
  const hasSeen = seenTours.includes(tour.id);
  const first = tour.items[0];
  const note = routeNote(location.pathname);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Page guide"
        title="Page guide for this screen"
        className="flex size-9 cursor-pointer items-center justify-center rounded-xl border border-gold-500/30 bg-gold-500/10 text-gold-200 transition-colors hover:bg-gold-500/20 focus-visible:outline-2 focus-visible:outline-gold-500"
      >
        <BookOpen className="size-4" />
      </button>

      {open && (
        <div
          aria-label="Page guide panel"
          className="fixed right-4 top-[4.5rem] z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-white/10 bg-ink-900 p-3 shadow-2xl shadow-black/60 lg:right-6"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gold-300">
              Page guide
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close page guide"
              className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <p className="mt-1.5 text-sm font-bold text-white">{first?.title ?? "This page"}</p>
          {note && <p className="mt-0.5 text-[11px] text-slate-500">{note}</p>}
          <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
            {first?.body ?? "A short guide for what is on this screen."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                startTour(tour.id);
                setOpen(false);
              }}
            >
              <BookOpen className="size-3.5" />
              {isActive ? "Guide running" : hasSeen ? "Replay guide" : "Show page guide"}
            </Button>
            <Link
              to={status.journeyPath}
              onClick={() => setOpen(false)}
              className="text-[11px] font-semibold text-gold-300 transition-colors hover:text-gold-200"
            >
              Full journey →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
