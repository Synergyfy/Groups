import { useEffect, useMemo, useState, type ReactNode } from "react";
import { JourneyContext, type JourneyContextValue } from "./context";

const STORAGE_KEY = "247gbs.journey.v1";

interface JourneyStorage {
  visited: string[];
  manual: string[];
  seenTours: string[];
}

function readStorage(): JourneyStorage {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { visited: [], manual: [], seenTours: [] };
    const parsed = JSON.parse(raw) as Partial<JourneyStorage>;
    return {
      visited: Array.isArray(parsed.visited) ? parsed.visited : [],
      manual: Array.isArray(parsed.manual) ? parsed.manual : [],
      seenTours: Array.isArray(parsed.seenTours) ? parsed.seenTours : [],
    };
  } catch {
    return { visited: [], manual: [], seenTours: [] };
  }
}

export default function JourneyProvider({ children }: { children: ReactNode }) {
  const [storage, setStorage] = useState<JourneyStorage>(readStorage);
  const [activeTour, setActiveTour] = useState<string | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
    } catch {
      /* storage is a convenience, never a requirement */
    }
  }, [storage]);

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
