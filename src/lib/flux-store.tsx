import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { dateKey, lastNDayKeys, todayKey } from "./flux-date";

export interface Task {
  id: string;
  text: string;
  completed: boolean;
}

/** Map of date key (yyyy-MM-dd) -> task list for that day */
export type DayMap = Record<string, Task[]>;

const STORAGE_KEY = "flux:days:v1";

interface FluxContextValue {
  days: DayMap;
  selectedDate: string;
  setSelectedDate: (key: string) => void;
  tasks: Task[]; // tasks for the selected day
  addTask: (text: string) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  isDayComplete: (key: string) => boolean;
  dayRatio: (key: string) => number; // 0..1, completed/total
  hasTasks: (key: string) => boolean;
  ready: boolean;
}

const FluxContext = createContext<FluxContextValue | null>(null);

function loadDays(): DayMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DayMap) : {};
  } catch {
    return {};
  }
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export function FluxProvider({ children }: { children: ReactNode }) {
  const [days, setDays] = useState<DayMap>({});
  const [selectedDate, setSelectedDate] = useState<string>(() => todayKey());
  const [ready, setReady] = useState(false);

  // Hydrate from localStorage on the client only (avoids SSR mismatch).
  useEffect(() => {
    setDays(loadDays());
    setSelectedDate(todayKey());
    setReady(true);
  }, []);

  // Persist whenever data changes (after hydration).
  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(days));
    } catch {
      /* ignore quota / private mode errors */
    }
  }, [days, ready]);

  const tasks = days[selectedDate] ?? [];

  const addTask = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setDays((prev) => {
        const list = prev[selectedDate] ?? [];
        return {
          ...prev,
          [selectedDate]: [
            ...list,
            { id: newId(), text: trimmed, completed: false },
          ],
        };
      });
    },
    [selectedDate],
  );

  const toggleTask = useCallback(
    (id: string) => {
      setDays((prev) => {
        const list = prev[selectedDate] ?? [];
        return {
          ...prev,
          [selectedDate]: list.map((t) =>
            t.id === id ? { ...t, completed: !t.completed } : t,
          ),
        };
      });
    },
    [selectedDate],
  );

  const deleteTask = useCallback(
    (id: string) => {
      setDays((prev) => {
        const list = (prev[selectedDate] ?? []).filter((t) => t.id !== id);
        const next = { ...prev };
        if (list.length) next[selectedDate] = list;
        else delete next[selectedDate];
        return next;
      });
    },
    [selectedDate],
  );

  const isDayComplete = useCallback(
    (key: string) => {
      const list = days[key];
      return !!list && list.length > 0 && list.every((t) => t.completed);
    },
    [days],
  );

  const dayRatio = useCallback(
    (key: string) => {
      const list = days[key];
      if (!list || list.length === 0) return 0;
      return list.filter((t) => t.completed).length / list.length;
    },
    [days],
  );

  const hasTasks = useCallback(
    (key: string) => !!days[key] && days[key].length > 0,
    [days],
  );

  const value = useMemo<FluxContextValue>(
    () => ({
      days,
      selectedDate,
      setSelectedDate,
      tasks,
      addTask,
      toggleTask,
      deleteTask,
      isDayComplete,
      dayRatio,
      hasTasks,
      ready,
    }),
    [
      days,
      selectedDate,
      tasks,
      addTask,
      toggleTask,
      deleteTask,
      isDayComplete,
      dayRatio,
      hasTasks,
      ready,
    ],
  );

  return <FluxContext.Provider value={value}>{children}</FluxContext.Provider>;
}

export function useFlux() {
  const ctx = useContext(FluxContext);
  if (!ctx) throw new Error("useFlux must be used within FluxProvider");
  return ctx;
}

/** Linear-regression slope sign over a series; classifies the consistency trend. */
export type Trend = "up" | "down" | "flat";

export function classifyTrend(points: number[]): Trend {
  const ys = points.filter((p) => !Number.isNaN(p));
  if (ys.length < 2) return "flat";
  const n = ys.length;
  const xMean = (n - 1) / 2;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  ys.forEach((y, i) => {
    num += (i - xMean) * (y - yMean);
    den += (i - xMean) ** 2;
  });
  const slope = den === 0 ? 0 : num / den;
  if (slope > 0.01) return "up";
  if (slope < -0.01) return "down";
  return "flat";
}

/** Helper to read the recent ratio series straight from the store. */
export function recentRatios(
  days: DayMap,
  n: number,
): { key: string; ratio: number; hasData: boolean }[] {
  return lastNDayKeys(n).map((key) => {
    const list = days[key];
    const hasData = !!list && list.length > 0;
    const ratio = hasData
      ? list.filter((t) => t.completed).length / list.length
      : 0;
    return { key, ratio, hasData };
  });
}

export { dateKey };
