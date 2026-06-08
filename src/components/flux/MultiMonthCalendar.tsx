import { useMemo, useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { Check, ChevronLeft, ChevronRight, CalendarCheck } from "lucide-react";
import {
  buildMonths,
  currentMonthIndex,
  dayNumber,
  isToday,
  todayKey,
  WEEKDAYS,
} from "@/lib/flux-date";
import { useFlux } from "@/lib/flux-store";
import { cn } from "@/lib/utils";

export function MultiMonthCalendar() {
  const months = useMemo(() => buildMonths(), []);
  const todayIdx = useMemo(() => currentMonthIndex(months), [months]);
  const [[index, dir], setState] = useState<[number, number]>([todayIdx, 0]);
  const { selectedDate, setSelectedDate, isDayComplete, hasTasks, dayRatio } =
    useFlux();

  const month = months[index];

  const go = (next: number) => {
    if (next < 0 || next >= months.length) return;
    setState([next, next > index ? 1 : -1]);
  };

  const snapToday = () => {
    setState([todayIdx, todayIdx > index ? 1 : -1]);
    setSelectedDate(todayKey());
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -70) go(index + 1);
    else if (info.offset.x > 70) go(index - 1);
  };

  return (
    <section aria-label="Calendar" className="select-none">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label="Previous month"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card/40 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            disabled={index === months.length - 1}
            aria-label="Next month"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card/40 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <h2 className="ml-2 text-lg font-extrabold tracking-tight">
            {month.label}
          </h2>
        </div>
        <button
          type="button"
          onClick={snapToday}
          className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary-glow transition-transform active:scale-95"
        >
          <CalendarCheck className="h-3.5 w-3.5" /> Today
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-2.5 sm:gap-3">
        {WEEKDAYS.map((w, i) => (
          <span
            key={i}
            className="text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60"
          >
            {w}
          </span>
        ))}
      </div>

      <div className="relative overflow-hidden">
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div
            key={index}
            custom={dir}
            initial={{ opacity: 0, x: dir * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -60 }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={onDragEnd}
            className="grid grid-cols-7 gap-2.5 sm:gap-3"
          >
            {Array.from({ length: month.leadingBlanks }).map((_, i) => (
              <span key={`b${i}`} aria-hidden />
            ))}
            {month.dayKeys.map((key) => {
              const complete = isDayComplete(key);
              const partial = !complete && hasTasks(key) && dayRatio(key) > 0;
              const selected = key === selectedDate;
              const today = isToday(key);
              return (
                <motion.button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(key)}
                  whileTap={{ scale: 0.9 }}
                  aria-pressed={selected}
                  aria-label={`Day ${dayNumber(key)}${complete ? ", completed" : ""}`}
                  className={cn(
                    "relative flex aspect-square items-center justify-center rounded-xl border text-sm font-semibold transition-colors duration-300",
                    complete
                      ? "border-transparent bg-success text-success-foreground glow-soft"
                      : "border-border bg-card/40 text-muted-foreground hover:border-primary/60 hover:text-foreground",
                    selected && !complete && "border-primary text-foreground",
                    today && !complete && "ring-1 ring-primary/60",
                  )}
                >
                  {partial && (
                    <span
                      className="absolute inset-0 rounded-xl bg-primary/15"
                      style={{ opacity: dayRatio(key) }}
                      aria-hidden
                    />
                  )}
                  {complete ? (
                    <Check className="h-4 w-4" strokeWidth={3} />
                  ) : (
                    <span className="relative">{dayNumber(key)}</span>
                  )}
                  {today && (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      <p className="mt-3 text-center text-[11px] text-muted-foreground/60">
        Swipe or use arrows to travel through {months[0].shortLabel} –{" "}
        {months[months.length - 1].shortLabel}
      </p>
    </section>
  );
}
