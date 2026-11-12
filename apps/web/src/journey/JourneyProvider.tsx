import { useMemo, useState, type ReactNode } from "react";
import { JourneyContext, type JourneyContextValue } from "./context";

interface JourneyStorage {
  visited: string[];
  manual: string[];
  seenTours: string[];
}

export default function JourneyProvider({ children }: { children: ReactNode }) {
  const [storage, setStorage] = useState<JourneyStorage>({
    visited: [],
    manual: [],
    seenTours: [],
  });
  const [activeTour, setActiveTour] = useState<string | null>(null);

  const value = useMemo<JourneyContextValue>(
    () => ({
      visited: storage.visited,
      manual: storage.manual,
      seenTours: storage.seenTours,
      activeTour,
      recordVisit: (path) =>
        setStorage((current) =>
          current.visited.includes(path)
            ? current
            : { ...current, visited: [...current.visited, path] }
        ),
      markDone: (id) =>
        setStorage((current) =>
          current.manual.includes(id)
            ? current
            : { ...current, manual: [...current.manual, id] }
        ),
      unmarkDone: (id) =>
        setStorage((current) => ({
          ...current,
          manual: current.manual.filter((entry) => entry !== id),
        })),
      recordTour: (id) =>
        setStorage((current) =>
          current.seenTours.includes(id)
            ? current
            : { ...current, seenTours: [...current.seenTours, id] }
        ),
      startTour: (id) => setActiveTour(id),
      stopTour: () => setActiveTour(null),
      resetJourney: () => {
        setStorage({ visited: [], manual: [], seenTours: [] });
        setActiveTour(null);
      },
    }),
    [storage, activeTour]
  );

  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
}
