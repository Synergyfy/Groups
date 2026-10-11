import { createContext, useContext } from "react";

export interface JourneyContextValue {
  visited: string[];
  manual: string[];
  seenTours: string[];
  activeTour: string | null;
  recordVisit: (path: string) => void;
  markDone: (id: string) => void;
  unmarkDone: (id: string) => void;
  recordTour: (id: string) => void;
  startTour: (id: string) => void;
  stopTour: () => void;
  resetJourney: () => void;
}

export const JourneyContext = createContext<JourneyContextValue | null>(null);

export function useJourney(): JourneyContextValue {
  const value = useContext(JourneyContext);
  if (!value) {
    throw new Error("useJourney must be used inside JourneyProvider");
  }
  return value;
}
