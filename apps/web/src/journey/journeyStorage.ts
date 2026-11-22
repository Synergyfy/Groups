/**
 * Journey progress survives page reloads so a page guide (and the checklist)
 * only auto-opens the first time a screen is seen, instead of on every load.
 */
export interface JourneyStorage {
  visited: string[];
  manual: string[];
  seenTours: string[];
}

const STORAGE_KEY = "mcom-journey-state";

export const EMPTY_JOURNEY: JourneyStorage = { visited: [], manual: [], seenTours: [] };

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

export function readJourneyStorage(): JourneyStorage {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_JOURNEY;
    const parsed = JSON.parse(raw) as Partial<JourneyStorage> | null;
    if (!parsed || typeof parsed !== "object") return EMPTY_JOURNEY;
    return {
      visited: asStringArray(parsed.visited),
      manual: asStringArray(parsed.manual),
      seenTours: asStringArray(parsed.seenTours),
    };
  } catch {
    return EMPTY_JOURNEY;
  }
}

export function writeJourneyStorage(storage: JourneyStorage): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
  } catch {
    /* storage unavailable — journey continues in memory for this session */
  }
}

export function clearJourneyStorage(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable — nothing to clear */
  }
}
