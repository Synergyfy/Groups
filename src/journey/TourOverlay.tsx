import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useJourney } from "./context";
import { findTour, getTour, type TourDef } from "./tours";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function measure(target: string): Rect | null {
  if (typeof document === "undefined") return null;
  const element = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
  if (!element) return null;
  const box = element.getBoundingClientRect();
  if (box.width === 0 && box.height === 0) return null;
  return { top: box.top, left: box.left, width: box.width, height: box.height };
}

export default function TourOverlay() {
  const location = useLocation();
  const { activeTour, seenTours } = useJourney();

  const matched = findTour(location.pathname);
  const tour: TourDef | null = activeTour
    ? (getTour(activeTour) ?? null)
    : matched.auto && !seenTours.includes(matched.id)
      ? matched
      : null;

  if (!tour) return null;
  return <TourRunner key={tour.id} tour={tour} />;
}

function TourRunner({ tour }: { tour: TourDef }) {
  const { recordTour, stopTour } = useJourney();
  const [index, setIndex] = useState(0);

  const item = tour.items[index];
  const rect = item.target ? measure(item.target) : null;
  const isLast = index === tour.items.length - 1;

  const finish = () => {
    recordTour(tour.id);
    stopTour();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
      if (event.key === "ArrowRight" && !isLast) setIndex((value) => value + 1);
      if (event.key === "ArrowLeft" && index > 0) setIndex((value) => value - 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const cardStyle = rect
    ? {
        top: `${Math.min(rect.top + rect.height + 14, window.innerHeight - 240)}px`,
        left: `${Math.min(Math.max(rect.left, 16), Math.max(window.innerWidth - 352, 16))}px`,
      }
    : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Screen tour">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px]" onClick={finish} aria-hidden="true" />

      {rect && (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-gold-400"
          style={{
            top: `${rect.top - 6}px`,
            left: `${rect.left - 6}px`,
            width: `${rect.width + 12}px`,
            height: `${rect.height + 12}px`,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.35), 0 0 24px rgba(230,169,43,0.45)",
          }}
          aria-hidden="true"
        />
      )}

      <div
        className="absolute w-[21rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-gold-500/40 bg-ink-900 p-4 shadow-2xl shadow-black/60"
        style={cardStyle}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gold-300">
              Page guide · step {index + 1} of {tour.items.length}
            </p>
            <p className="mt-1.5 text-sm font-bold text-white">{item.title}</p>
          </div>
          <button
            type="button"
            onClick={finish}
            aria-label="Close tour"
            className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        <p className="mt-2 text-xs leading-relaxed text-slate-300">{item.body}</p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setIndex((value) => Math.max(0, value - 1))}
            disabled={index === 0}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-400 transition-colors hover:text-white disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronLeft className="size-4" /> Back
          </button>

          <div className="flex items-center gap-1.5">
            <span className="flex gap-1">
              {tour.items.map((entry, stepIndex) => (
                <span
                  key={entry.title}
                  className={`size-1.5 rounded-full ${
                    stepIndex === index ? "bg-gold-400" : "bg-white/20"
                  }`}
                />
              ))}
            </span>
            <button
              type="button"
              onClick={finish}
              className="cursor-pointer rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-300"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={() => (isLast ? finish() : setIndex((value) => value + 1))}
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-ink-950 transition-colors hover:bg-gold-400"
            >
              {isLast ? "Got it" : "Next"} <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
