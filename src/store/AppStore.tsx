import { useEffect, useMemo, useReducer } from "react";
import type { ReactNode } from "react";
import { AppStoreContext } from "./context";
import { appReducer, createInitialAppState, STORE_VERSION } from "./reducer";
import type { AppState } from "./reducer";
import StoreInspector from "./StoreInspector";

const STORAGE_KEY = "247gbs.group.store.v1";

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
