import { useMemo } from "react";
import { motion } from "motion/react";
import {
  differenceInCalendarDays,
  endOfYear,
  startOfDay,
  startOfYear,
} from "date-fns";

/** Minimalist "Year-at-a-Glance" bar showing how much of the year is spent. */
export function YearProgress() {
  const { pct, remaining, dayOfYear, totalDays, year } = useMemo(() => {
    const now = startOfDay(new Date());
    const start = startOfYear(now);
    const end = endOfYear(now);
    const total = differenceInCalendarDays(end, start) + 1;
    const day = differenceInCalendarDays(now, start) + 1;
    return {
      dayOfYear: day,
      totalDays: total,
      remaining: total - day,
      year: now.getFullYear(),
      pct: Math.min(100, Math.round((day / total) * 100)),
    };
  }, []);

  return (
    <section
      aria-label="Annual progress"
      className="rounded-2xl border border-white/10 bg-card/40 p-4 backdrop-blur-sm"
    >
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {year} Progress
        </p>
        <p className="text-xs font-bold tabular-nums text-foreground">
          <span className="text-primary-glow">{remaining}</span>
          <span className="text-muted-foreground"> days remaining</span>
        </p>
      </div>

      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 24 }}
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary-glow"
        />
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground/70 tabular-nums">
        Day {dayOfYear} of {totalDays} · {pct}% complete
      </p>
    </section>
  );
}
