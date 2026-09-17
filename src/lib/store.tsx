import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppState } from "../data/types";
import { INITIAL_STATE } from "../data/seed";

const KEY = "bayit.state.v1";

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return INITIAL_STATE;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      settings: { ...INITIAL_STATE.settings, ...parsed.settings },
      budgetLines: parsed.budgetLines ?? INITIAL_STATE.budgetLines,
      expenses: parsed.expenses ?? INITIAL_STATE.expenses,
      planned: parsed.planned ?? INITIAL_STATE.planned,
      capital: parsed.capital ?? INITIAL_STATE.capital,
      tracks: parsed.tracks ?? INITIAL_STATE.tracks,
    };
  } catch {
    return INITIAL_STATE;
  }
}

interface StoreValue {
  state: AppState;
  update: (patch: Partial<AppState>) => void;
  reset: () => void;
  exportJson: () => void;
  importJson: (file: File) => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // Storage full or blocked (private window) — the session still works in memory.
    }
  }, [state]);

  const update = useCallback((patch: Partial<AppState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bayit-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state]);

  const importJson = useCallback(async (file: File) => {
    const text = await file.text();
    const parsed = JSON.parse(text) as Partial<AppState>;
    setState({
      settings: { ...INITIAL_STATE.settings, ...parsed.settings },
      budgetLines: parsed.budgetLines ?? INITIAL_STATE.budgetLines,
      expenses: parsed.expenses ?? INITIAL_STATE.expenses,
      planned: parsed.planned ?? INITIAL_STATE.planned,
      capital: parsed.capital ?? INITIAL_STATE.capital,
      tracks: parsed.tracks ?? INITIAL_STATE.tracks,
    });
  }, []);

  const value = useMemo(
    () => ({ state, update, reset, exportJson, importJson }),
    [state, update, reset, exportJson, importJson]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
