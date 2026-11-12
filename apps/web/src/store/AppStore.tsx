import { useMemo, useReducer } from "react";
import type { ReactNode } from "react";
import { AppStoreContext } from "./context";
import { appReducer, createInitialAppState } from "./reducer";
import StoreInspector from "./StoreInspector";

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    appReducer,
    undefined,
    createInitialAppState,
  );

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <AppStoreContext.Provider value={value}>
      {children}
      <StoreInspector />
    </AppStoreContext.Provider>
  );
}
