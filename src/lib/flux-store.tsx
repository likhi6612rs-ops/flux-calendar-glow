import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  differenceInCalendarDays,
  parseISO,
  startOfDay,
  subDays,
} from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";
import { todayKey, lastNDayKeys, isToday, isPast, dateKey } from "./flux-date";

export interface ProcrastinationSummary {
  /** incomplete task-instances across the window (past days only) */
  pending: number;
  /** number of past days that still carry unfinished tasks */
  daysWithDebt: number;
  /** total task-instances scheduled in the window */
  total: number;
  /** completed task-instances in the window */
  completed: number;
  /** 0..1 completion ratio across the window */
  ratio: number;
  windowDays: number;
}

export interface StreakInfo {
  /** consecutive fully-completed days ending today (or yesterday, grace) */
  current: number;
  /** longest run of fully-completed days over the past year */
  best: number;
  /** whether today is already fully completed */
  todayDone: boolean;
}

export interface TaskSpan {
  id: string;
  text: string;
  start_date: string; // yyyy-MM-dd
  span_days: number;
}

export type SpanCategory = "sprint" | "standard" | "longhaul";

export const SPAN_OPTIONS: { label: string; days: number }[] = [
  { label: "1 Day", days: 1 },
  { label: "2 Days", days: 2 },
  { label: "3 Days", days: 3 },
  { label: "10 Days", days: 10 },
  { label: "1 Week", days: 7 },
  { label: "1 Month", days: 30 },
  { label: "2 Months", days: 60 },
  { label: "3 Months", days: 90 },
];

export function spanCategory(span: number): SpanCategory {
  if (span <= 3) return "sprint";
  if (span <= 31) return "standard";
  return "longhaul";
}

export const CATEGORY_META: Record<
  SpanCategory,
  { label: string; color: string }
> = {
  sprint: { label: "Sprints", color: "var(--chart-2)" },
  standard: { label: "Standard", color: "var(--chart-1)" },
  longhaul: { label: "Long-haul", color: "var(--chart-3)" },
};

function covers(task: TaskSpan, key: string): boolean {
  const diff = differenceInCalendarDays(parseISO(key), parseISO(task.start_date));
  return diff >= 0 && diff < task.span_days;
}

const ckey = (taskId: string, date: string) => `${taskId}|${date}`;

interface FluxContextValue {
  tasks: TaskSpan[];
  completions: Set<string>;
  ready: boolean;
  selectedDate: string;
  setSelectedDate: (key: string) => void;
  tasksForDate: (key: string) => TaskSpan[];
  isCompleted: (taskId: string, key: string) => boolean;
  isDayComplete: (key: string) => boolean;
  dayRatio: (key: string) => number;
  hasTasks: (key: string) => boolean;
  isOverdue: (key: string) => boolean;
  streak: () => StreakInfo;
  procrastination: (windowDays: number) => ProcrastinationSummary;
  addTask: (text: string, spanDays: number) => Promise<void>;
  toggleTask: (taskId: string, date: string) => Promise<void>;
  editTask: (taskId: string, text: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
}

const FluxContext = createContext<FluxContextValue | null>(null);

export function FluxProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskSpan[]>([]);
  const [completions, setCompletions] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<string>(() => todayKey());
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    if (!user) return;
    const [{ data: t }, { data: c }] = await Promise.all([
      supabase
        .from("tasks")
        .select("id, text, start_date, span_days")
        .eq("user_id", user.id),
      supabase
        .from("task_completions")
        .select("task_id, date")
        .eq("user_id", user.id),
    ]);
    setTasks((t ?? []) as TaskSpan[]);
    setCompletions(new Set((c ?? []).map((r) => ckey(r.task_id, r.date))));
    setReady(true);
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  const tasksForDate = useCallback(
    (key: string) => tasks.filter((t) => covers(t, key)),
    [tasks],
  );

  const isCompleted = useCallback(
    (taskId: string, key: string) => completions.has(ckey(taskId, key)),
    [completions],
  );

  const dayRatio = useCallback(
    (key: string) => {
      const list = tasksForDate(key);
      if (list.length === 0) return 0;
      const done = list.filter((t) => completions.has(ckey(t.id, key))).length;
      return done / list.length;
    },
    [tasksForDate, completions],
  );

  const isDayComplete = useCallback(
    (key: string) => {
      const list = tasksForDate(key);
      return (
        list.length > 0 && list.every((t) => completions.has(ckey(t.id, key)))
      );
    },
    [tasksForDate, completions],
  );

  const hasTasks = useCallback(
    (key: string) => tasksForDate(key).length > 0,
    [tasksForDate],
  );

  // A past day that still carries at least one unfinished task.
  const isOverdue = useCallback(
    (key: string) =>
      isPast(key) &&
      !isToday(key) &&
      tasksForDate(key).length > 0 &&
      !tasksForDate(key).every((t) => completions.has(ckey(t.id, key))),
    [tasksForDate, completions],
  );

  // Consecutive fully-completed days ending today (with a one-day grace so a
  // still-open today doesn't visually break the streak yet).
  const streak = useCallback((): StreakInfo => {
    const dayDone = (key: string) => {
      const list = tasksForDate(key);
      return list.length > 0 && list.every((t) => completions.has(ckey(t.id, key)));
    };
    const base = startOfDay(new Date());

    let current = 0;
    let cursor = dayDone(dateKey(base)) ? base : subDays(base, 1);
    while (dayDone(dateKey(cursor))) {
      current += 1;
      cursor = subDays(cursor, 1);
    }

    let best = 0;
    let run = 0;
    for (let i = 365; i >= 0; i--) {
      if (dayDone(dateKey(subDays(base, i)))) {
        run += 1;
        best = Math.max(best, run);
      } else {
        run = 0;
      }
    }

    return { current, best, todayDone: dayDone(dateKey(base)) };
  }, [tasksForDate, completions]);


  const procrastination = useCallback(
    (windowDays: number): ProcrastinationSummary => {
      const keys = lastNDayKeys(windowDays).filter((k) => !isToday(k));
      let pending = 0;
      let total = 0;
      let completed = 0;
      let daysWithDebt = 0;
      keys.forEach((key) => {
        const list = tasksForDate(key);
        let dayPending = 0;
        list.forEach((t) => {
          total += 1;
          if (completions.has(ckey(t.id, key))) completed += 1;
          else {
            pending += 1;
            dayPending += 1;
          }
        });
        if (dayPending > 0) daysWithDebt += 1;
      });
      return {
        pending,
        daysWithDebt,
        total,
        completed,
        ratio: total === 0 ? 1 : completed / total,
        windowDays,
      };
    },
    [tasksForDate, completions],
  );


  const addTask = useCallback(
    async (text: string, spanDays: number) => {
      if (!user) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      const { data } = await supabase
        .from("tasks")
        .insert({
          user_id: user.id,
          text: trimmed,
          start_date: selectedDate,
          span_days: spanDays,
        })
        .select("id, text, start_date, span_days")
        .single();
      if (data) setTasks((prev) => [...prev, data as TaskSpan]);
    },
    [user, selectedDate],
  );

  const toggleTask = useCallback(
    async (taskId: string, date: string) => {
      if (!user) return;
      const key = ckey(taskId, date);
      if (completions.has(key)) {
        setCompletions((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        await supabase
          .from("task_completions")
          .delete()
          .eq("task_id", taskId)
          .eq("date", date);
      } else {
        setCompletions((prev) => new Set(prev).add(key));
        await supabase
          .from("task_completions")
          .insert({ task_id: taskId, user_id: user.id, date });
      }
    },
    [user, completions],
  );

  const editTask = useCallback(async (taskId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, text: trimmed } : t)),
    );
    await supabase.from("tasks").update({ text: trimmed }).eq("id", taskId);
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setCompletions((prev) => {
      const next = new Set<string>();
      prev.forEach((k) => {
        if (!k.startsWith(`${taskId}|`)) next.add(k);
      });
      return next;
    });
    await supabase.from("tasks").delete().eq("id", taskId);
  }, []);

  const value = useMemo<FluxContextValue>(
    () => ({
      tasks,
      completions,
      ready,
      selectedDate,
      setSelectedDate,
      tasksForDate,
      isCompleted,
      isDayComplete,
      dayRatio,
      hasTasks,
      isOverdue,
      streak,
      procrastination,
      addTask,
      toggleTask,
      editTask,
      deleteTask,
    }),
    [
      tasks,
      completions,
      ready,
      selectedDate,
      tasksForDate,
      isCompleted,
      isDayComplete,
      dayRatio,
      hasTasks,
      isOverdue,
      streak,
      procrastination,
      addTask,
      toggleTask,
      editTask,
      deleteTask,
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

export interface SeriesPoint {
  key: string;
  overall: number | null;
  sprint: number | null;
  standard: number | null;
  longhaul: number | null;
}

/** Builds per-day completion ratios broken down by task lifespan category. */
export function buildSeries(
  tasks: TaskSpan[],
  completions: Set<string>,
  keys: string[],
): SeriesPoint[] {
  return keys.map((key) => {
    const covering = tasks.filter((t) => covers(t, key));
    const ratioFor = (cat: SpanCategory | "all"): number | null => {
      const list =
        cat === "all"
          ? covering
          : covering.filter((t) => spanCategory(t.span_days) === cat);
      if (list.length === 0) return null;
      const done = list.filter((t) => completions.has(ckey(t.id, key))).length;
      return done / list.length;
    };
    return {
      key,
      overall: ratioFor("all"),
      sprint: ratioFor("sprint"),
      standard: ratioFor("standard"),
      longhaul: ratioFor("longhaul"),
    };
  });
}

/** Average efficiency (0..1) across a window for one category, ignoring empty days. */
export function categoryEfficiency(series: SeriesPoint[], cat: keyof SeriesPoint) {
  const vals = series
    .map((p) => p[cat])
    .filter((v): v is number => typeof v === "number");
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
