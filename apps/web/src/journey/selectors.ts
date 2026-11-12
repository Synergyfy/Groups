import { useLocation } from "react-router-dom";
import { useAppState } from "../store/selectors";
import { useJourney } from "./context";
import { ADMIN_STEPS, BUSINESS_STEPS, type JourneyScope, type JourneyStep } from "./steps";
import { matchPath, routeNote } from "./routes";
import { findTour } from "./tours";

export interface JourneyStatus {
  scope: JourneyScope;
  journeyPath: string;
  steps: JourneyStep[];
  done: Record<string, boolean>;
  doneCount: number;
  total: number;
  percent: number;
  currentIndex: number;
  current: JourneyStep;
  allDone: boolean;
  onThisStep: boolean;
  note?: string;
  tourId: string;
}

export function useJourneyStatus(): JourneyStatus {
  const location = useLocation();
  const state = useAppState();
  const { visited, manual } = useJourney();

  const scope: JourneyScope = location.pathname.startsWith("/admin") ? "admin" : "business";
  const steps = scope === "admin" ? ADMIN_STEPS : BUSINESS_STEPS;
  const detectContext = { state, visited };

  const done: Record<string, boolean> = {};
  for (const step of steps) {
    done[step.id] = Boolean(step.detect?.(detectContext)) || manual.includes(step.id);
  }

  const firstOpen = steps.findIndex((step) => !done[step.id]);
  const currentIndex = firstOpen === -1 ? steps.length - 1 : firstOpen;
  const doneCount = steps.filter((step) => done[step.id]).length;

  return {
    scope,
    journeyPath: scope === "admin" ? "/admin/journey" : "/business/journey",
    steps,
    done,
    doneCount,
    total: steps.length,
    percent: Math.round((doneCount / steps.length) * 100),
    currentIndex,
    current: steps[currentIndex],
    allDone: doneCount === steps.length,
    onThisStep: matchPath(steps[currentIndex].route, location.pathname),
    note: routeNote(location.pathname),
    tourId: findTour(location.pathname).id,
  };
}
