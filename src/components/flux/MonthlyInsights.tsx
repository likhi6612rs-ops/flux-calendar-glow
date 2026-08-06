import { useMemo, useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { ChevronLeft, ChevronRight, CalendarCheck } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, getDaysInMonth, parseISO } from "date-fns";
import { useFlux } from "@/lib/flux-store";
import { dateKey, isPast, isToday } from "@/lib/flux-date";

interface MonthRef {
  year: number;
  monthIndex: number;
  label: string;
}

function monthsFrom(start: Date, end: Date): MonthRef[] {
  const list: MonthRef[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= last) {
    list.push({
      year: cursor.getFullYear(),
      monthIndex: cursor.getMonth(),
      label: format(cursor, "MMMM yyyy"),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return list;
}

function DayTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-white/10 bg-popover/90 px-3 py-2 text-xs shadow-lg backdrop-blur-xl">
      <p className="font-bold text-popover-foreground">{p.full ?? label}</p>
      <p className="text-muted-foreground">
        Completion{" "}
        <span className="font-semibold text-popover-foreground">
          {p.value}%
        </span>
      </p>
      <p className="text-muted-foreground">
        {p.completed}/{p.total} tasks done
      </p>
    </div>
  );
}

export function MonthlyInsights() {
  const { tasks, tasksForDate, isCompleted } = useFlux();

  const months = useMemo(() => {
    const now = new Date();
    const starts = tasks.map((t) => parseISO(t.start_date).getTime());
    const first = starts.length ? new Date(Math.min(...starts)) : now;
    return monthsFrom(first, now);
  }, [tasks]);

  const [[index, dir], setState] = useState<[number, number]>([
    Math.max(months.length - 1, 0),
    0,
  ]);
  const safeIndex = Math.min(index, months.length - 1);
  const month = months[safeIndex];

  const go = (next: number) => {
    if (next < 0 || next >= months.length) return;
    setState([next, next > safeIndex ? 1 : -1]);
  };
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -70) go(safeIndex + 1);
    else if (info.offset.x > 70) go(safeIndex - 1);
  };

  const { data, stats, average } = useMemo(() => {
    if (!month)
      return { data: [], stats: { total: 0, completed: 0, slip: 0, active: 0 }, average: null };
    const days = getDaysInMonth(new Date(month.year, month.monthIndex, 1));
    const rows: any[] = [];
    let total = 0;
    let completed = 0;
    let slip = 0;
    const activeIds = new Set<string>();

    for (let d = 1; d <= days; d++) {
      const key = dateKey(new Date(month.year, month.monthIndex, d));
      const future = !isPast(key) && !isToday(key);
      const list = tasksForDate(key);
      let done = 0;
      list.forEach((t) => {
        activeIds.add(t.id);
        if (isCompleted(t.id, key)) done += 1;
      });
      if (!future) {
        total += list.length;
        completed += done;
        if (list.length > 0 && done < list.length && !isToday(key)) slip += 1;
      }
      rows.push({
        label: String(d),
        full: format(new Date(month.year, month.monthIndex, d), "MMM d, yyyy"),
        value: future || list.length === 0 ? null : Math.round((done / list.length) * 100),
        total: list.length,
        completed: done,
      });
    }

    const vals = rows
      .map((r) => r.value)
      .filter((v): v is number => typeof v === "number");
    return {
      data: rows,
      stats: { total, completed, slip, active: activeIds.size },
      average: vals.length
        ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
        : null,
    };
  }, [month, tasksForDate, isCompleted]);

  if (!month) return null;

  return (
    <section aria-label="Monthly insights" className="select-none">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => go(safeIndex - 1)}
            disabled={safeIndex === 0}
            aria-label="Previous month"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card/40 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => go(safeIndex + 1)}
            disabled={safeIndex === months.length - 1}
            aria-label="Next month"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card/40 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <h3 className="ml-2 text-base font-extrabold tracking-tight">
            {month.label}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => go(months.length - 1)}
          className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary-glow transition-transform active:scale-95"
        >
          <CalendarCheck className="h-3.5 w-3.5" /> This month
        </button>
      </div>

      <div className="relative overflow-hidden">
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div
            key={safeIndex}
            custom={dir}
            initial={{ opacity: 0, x: dir * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -60 }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={onDragEnd}
            className="space-y-4"
          >
            <div className="rounded-2xl border border-white/10 bg-card/40 p-4 backdrop-blur-sm">
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={data}
                    margin={{ top: 12, right: 14, left: -18, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="monthFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      stroke="var(--border)"
                      strokeOpacity={0.5}
                      strokeDasharray="3 5"
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                      minTickGap={10}
                    />
                    <YAxis
                      domain={[0, 100]}
                      ticks={[0, 25, 50, 75, 100]}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      cursor={{
                        stroke: "var(--primary)",
                        strokeWidth: 1,
                        strokeDasharray: "4 4",
                      }}
                      content={<DayTooltip />}
                    />
                    {average !== null && (
                      <ReferenceLine
                        y={average}
                        stroke="var(--primary)"
                        strokeOpacity={0.55}
                        strokeDasharray="6 6"
                        label={{
                          value: `avg ${average}%`,
                          position: "insideTopRight",
                          fill: "var(--muted-foreground)",
                          fontSize: 10,
                        }}
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey="value"
                      name="Completion"
                      stroke="var(--primary)"
                      strokeWidth={2.2}
                      fill="url(#monthFill)"
                      connectNulls
                      dot={{
                        r: 2.5,
                        fill: "var(--card)",
                        stroke: "var(--primary)",
                        strokeWidth: 2,
                      }}
                      activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2.5 rounded-2xl border border-white/10 bg-card/40 p-4 backdrop-blur-sm">
              {[
                { label: "Active tasks", value: stats.active },
                { label: "Scheduled", value: stats.total },
                { label: "Completed", value: stats.completed },
                { label: "Slip days", value: stats.slip },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-lg font-extrabold tracking-tight">{s.value}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
