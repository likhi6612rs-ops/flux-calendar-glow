import { motion } from "motion/react";
import { Flame, Trophy } from "lucide-react";
import { useFlux } from "@/lib/flux-store";
import { cn } from "@/lib/utils";

/** Consistency streak — increments as consecutive days are fully completed. */
export function StreakCounter() {
  const { streak } = useFlux();
  const { current, best, todayDone } = streak();

  const lit = current > 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      aria-label="Consistency streak"
      className={cn(
        "relative flex items-center justify-between gap-3 overflow-hidden rounded-2xl border p-4 backdrop-blur-sm",
        lit ? "border-primary/30 bg-primary/[0.06]" : "border-white/10 bg-card/40",
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
            lit ? "bg-primary/15 text-primary-glow" : "bg-muted text-muted-foreground",
          )}
        >
          <Flame className={cn("h-6 w-6", lit && "drop-shadow-[0_0_6px_var(--primary)]")} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Current Streak
          </p>
          <p className="text-2xl font-extrabold leading-tight tracking-tight tabular-nums">
            {current} <span className="text-sm font-bold text-muted-foreground">
              day{current === 1 ? "" : "s"}
            </span>
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {todayDone
              ? "Today's tasks are done — keep it alive!"
              : current > 0
                ? "Finish today's tasks to extend it."
                : "Complete a full day to start a streak."}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="flex items-center gap-1 rounded-full border border-white/10 bg-background/40 px-2.5 py-1 text-[11px] font-bold text-amber-300">
          <Trophy className="h-3 w-3" /> {best}
        </span>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground/60">
          Best
        </span>
      </div>
    </motion.section>
  );
}
