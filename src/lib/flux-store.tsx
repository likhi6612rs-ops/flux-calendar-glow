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
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfDay,
  subDays,
} from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";
import { todayKey, lastNDayKeys, isToday, isPast, dateKey } from "./flux-date";

export interface ProcrastinationSummary {
  pending: number;
  daysWithDebt: number;
  total: number;
  completed: number;
  ratio: number;
  windowDays: number;
}

export interface StreakInfo {
  current: number;
  best: number;
  todayDone: boolean;
}

export interface TaskSpan {
  id: string;
  text: string;
  start_date: string;
  span_days: number;
  user_id: string;
  transfer_count: number;
  status: "active" | "expired";
}

export const MAX_TRANSFERS = 3;

export interface ProfileLite {
  id: string;
  display_name: string | null;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
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
  /** Set of `${taskId}|${date}` for every completion visible to the user. */
  completions: Set<string>;
  ready: boolean;
  selectedDate: string;
  setSelectedDate: (key: string) => void;
  tasksForDate: (key: string) => TaskSpan[];
  isCompleted: (taskId: string, key: string) => boolean;
  completedBy: (taskId: string, key: string) => string | null;
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
  isMine: (taskId: string) => boolean;
  ownerOf: (taskId: string) => ProfileLite | null;
  profileFor: (userId: string | null | undefined) => ProfileLite | null;
  shiftTask: (taskId: string) => Promise<void>;
  reload: () => Promise<void>;
}

const FluxContext = createContext<FluxContextValue | null>(null);

export function FluxProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskSpan[]>([]);
  // key = `${taskId}|${date}`  →  user_id of the person who ticked it
  const [completionsBy, setCompletionsBy] = useState<Map<string, string>>(
    new Map(),
  );
  const [profiles, setProfiles] = useState<Map<string, ProfileLite>>(new Map());
  const [selectedDate, setSelectedDate] = useState<string>(() => todayKey());
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    if (!user) return;
    // Tasks the RLS layer lets us see (own + shared-with-us via task_permissions)
    const [{ data: t }, { data: c }] = await Promise.all([
      supabase
        .from("tasks")
        .select("id, text, start_date, span_days, user_id, transfer_count, status"),
      supabase.from("task_completions").select("task_id, date, user_id"),
    ]);
    const nextTasks = (t ?? []) as TaskSpan[];
    setTasks(nextTasks);
    const map = new Map<string, string>();
    (c ?? []).forEach((r) => map.set(ckey(r.task_id, r.date), r.user_id));
    setCompletionsBy(map);

    // Pull profiles for anyone whose id appears in tasks (owners) or completions.
    const needed = new Set<string>();
    nextTasks.forEach((row) => needed.add(row.user_id));
    (c ?? []).forEach((r) => needed.add(r.user_id));
    needed.add(user.id);
    const ids = [...needed];
    if (ids.length > 0) {
      const { data: p } = await supabase
        .from("profiles")
        .select("id, display_name, full_name, email, avatar_url")
        .in("id", ids);
      const pmap = new Map<string, ProfileLite>();
      (p ?? []).forEach((row) => pmap.set(row.id, row as ProfileLite));
      setProfiles(pmap);
    }
    setReady(true);
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Realtime: mirror completion inserts/deletes for tasks we can see. RLS
  // still gates delivery, so we only receive events for our own tasks or
  // tasks explicitly shared with us.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`completions:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_completions" },
        (payload) => {
          setCompletionsBy((prev) => {
            const next = new Map(prev);
            if (payload.eventType === "DELETE") {
              const old = payload.old as { task_id: string; date: string };
              if (old?.task_id) next.delete(ckey(old.task_id, old.date));
            } else {
              const row = payload.new as {
                task_id: string;
                date: string;
                user_id: string;
              };
              if (row?.task_id) next.set(ckey(row.task_id, row.date), row.user_id);
            }
            return next;
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_permissions" },
        () => {
          // Access grants changed — reload tasks visibility.
          reload();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, reload]);

  const tasksForDate = useCallback(
    (key: string) => tasks.filter((t) => covers(t, key)),
    [tasks],
  );

  const isCompleted = useCallback(
    (taskId: string, key: string) => completionsBy.has(ckey(taskId, key)),
    [completionsBy],
  );

  const completedBy = useCallback(
    (taskId: string, key: string) => completionsBy.get(ckey(taskId, key)) ?? null,
    [completionsBy],
  );

  const dayRatio = useCallback(
    (key: string) => {
      const list = tasksForDate(key);
      if (list.length === 0) return 0;
      const done = list.filter((t) => completionsBy.has(ckey(t.id, key))).length;
      return done / list.length;
    },
    [tasksForDate, completionsBy],
  );

  const isDayComplete = useCallback(
    (key: string) => {
      const list = tasksForDate(key);
      return (
        list.length > 0 && list.every((t) => completionsBy.has(ckey(t.id, key)))
      );
    },
    [tasksForDate, completionsBy],
  );

  const hasTasks = useCallback(
    (key: string) => tasksForDate(key).length > 0,
    [tasksForDate],
  );

  const isOverdue = useCallback(
    (key: string) =>
      isPast(key) &&
      !isToday(key) &&
      tasksForDate(key).length > 0 &&
      !tasksForDate(key).every((t) => completionsBy.has(ckey(t.id, key))),
    [tasksForDate, completionsBy],
  );

  const streak = useCallback((): StreakInfo => {
    const dayDone = (key: string) => {
      const list = tasksForDate(key);
      return list.length > 0 && list.every((t) => completionsBy.has(ckey(t.id, key)));
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
  }, [tasksForDate, completionsBy]);

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
          if (completionsBy.has(ckey(t.id, key))) completed += 1;
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
    [tasksForDate, completionsBy],
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
        .select("id, text, start_date, span_days, user_id")
        .single();
      if (data) setTasks((prev) => [...prev, data as TaskSpan]);
    },
    [user, selectedDate],
  );

  const toggleTask = useCallback(
    async (taskId: string, date: string) => {
      if (!user) return;
      const key = ckey(taskId, date);
      const existing = completionsBy.get(key);
      if (existing) {
        // Only the person who ticked it can un-tick it (matches RLS).
        if (existing !== user.id) return;
        setCompletionsBy((prev) => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
        await supabase
          .from("task_completions")
          .delete()
          .eq("task_id", taskId)
          .eq("date", date)
          .eq("user_id", user.id);
      } else {
        setCompletionsBy((prev) => new Map(prev).set(key, user.id));
        await supabase
          .from("task_completions")
          .insert({ task_id: taskId, user_id: user.id, date });
      }
    },
    [user, completionsBy],
  );

  const editTask = useCallback(
    async (taskId: string, text: string) => {
      if (!user) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      // Only owners can edit; RLS enforces this too.
      const target = tasks.find((t) => t.id === taskId);
      if (target && target.user_id !== user.id) return;
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, text: trimmed } : t)),
      );
      await supabase.from("tasks").update({ text: trimmed }).eq("id", taskId);
    },
    [user, tasks],
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      if (!user) return;
      const target = tasks.find((t) => t.id === taskId);
      if (target && target.user_id !== user.id) return;
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setCompletionsBy((prev) => {
        const next = new Map<string, string>();
        prev.forEach((v, k) => {
          if (!k.startsWith(`${taskId}|`)) next.set(k, v);
        });
        return next;
      });
      await supabase.from("tasks").delete().eq("id", taskId);
    },
    [user, tasks],
  );

  const isMine = useCallback(
    (taskId: string) => {
      if (!user) return false;
      const t = tasks.find((x) => x.id === taskId);
      return !!t && t.user_id === user.id;
    },
    [tasks, user],
  );

  const ownerOf = useCallback(
    (taskId: string) => {
      const t = tasks.find((x) => x.id === taskId);
      if (!t) return null;
      return profiles.get(t.user_id) ?? null;
    },
    [tasks, profiles],
  );

  const profileFor = useCallback(
    (userId: string | null | undefined) =>
      userId ? profiles.get(userId) ?? null : null,
    [profiles],
  );

  const completionsSet = useMemo(
    () => new Set(completionsBy.keys()),
    [completionsBy],
  );

  const value = useMemo<FluxContextValue>(
    () => ({
      tasks,
      completions: completionsSet,
      ready,
      selectedDate,
      setSelectedDate,
      tasksForDate,
      isCompleted,
      completedBy,
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
      isMine,
      ownerOf,
      profileFor,
      reload,
    }),
    [
      tasks,
      completionsSet,
      ready,
      selectedDate,
      tasksForDate,
      isCompleted,
      completedBy,
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
      isMine,
      ownerOf,
      profileFor,
      reload,
    ],
  );

  return <FluxContext.Provider value={value}>{children}</FluxContext.Provider>;
}

export function useFlux() {
  const ctx = useContext(FluxContext);
  if (!ctx) throw new Error("useFlux must be used within FluxProvider");
  return ctx;
}

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

export function categoryEfficiency(series: SeriesPoint[], cat: keyof SeriesPoint) {
  const vals = series
    .map((p) => p[cat])
    .filter((v): v is number => typeof v === "number");
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
