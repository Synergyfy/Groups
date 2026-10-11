import { createContext, useContext } from "react";
import type { Dispatch } from "react";
import type { AppAction, AppState } from "./reducer";

export interface AppStore {
  state: AppState;
  dispatch: Dispatch<AppAction>;
}

export const AppStoreContext = createContext<AppStore | null>(null);

export function useAppStore(): AppStore {
  const store = useContext(AppStoreContext);
  if (!store) {
    throw new Error("useAppStore must be used inside <AppStoreProvider>");
  }
  return store;
}
