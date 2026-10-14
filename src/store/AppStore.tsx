import { useEffect, useMemo, useReducer } from "react";
import type { ReactNode } from "react";
import { AppStoreContext } from "./context";
import { appReducer, createInitialAppState, STORE_VERSION } from "./reducer";
import type { AppState } from "./reducer";
import StoreInspector from "./StoreInspector";

// Bump the key whenever the seed data changes so a previously cached demo
// store can never hide freshly added demo circles / invitations.
const STORAGE_KEY = "247gbs.group.store.v2";

function loadState(): AppState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialAppState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    if (parsed.version !== STORE_VERSION) return createInitialAppState();
    const initial = createInitialAppState();
    return {
      ...initial,
      ...parsed,
      version: STORE_VERSION,
      adminConfig: {
        ...initial.adminConfig,
        ...parsed.adminConfig,
        automaticGrouping: {
          ...initial.adminConfig.automaticGrouping,
          ...parsed.adminConfig?.automaticGrouping,
        },
        groupTypes: parsed.adminConfig?.groupTypes ?? initial.adminConfig.groupTypes,
        stageLabels: parsed.adminConfig?.stageLabels ?? initial.adminConfig.stageLabels,
        mandatoryGroups:
          parsed.adminConfig?.mandatoryGroups ?? initial.adminConfig.mandatoryGroups,
        paymentRules: {
          ...initial.adminConfig.paymentRules,
          ...parsed.adminConfig?.paymentRules,
        },
      },
    };
  } catch {
    return createInitialAppState();
  }
}

function persist(state: AppState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable or full — prototype keeps working in memory */
  }
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, undefined, loadState);

  useEffect(() => {
    persist(state);
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <AppStoreContext.Provider value={value}>
      {children}
      <StoreInspector />
    </AppStoreContext.Provider>
  );
}
