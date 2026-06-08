import { motion } from "motion/react";
import { AlertCircle, CheckCircle2, Flame } from "lucide-react";
import { useFlux } from "@/lib/flux-store";
import { cn } from "@/lib/utils";

const WINDOW = 3;

export function ProcrastinationTracker() {
  const { procrastination } = useFlux();
  const s = procrastination(WINDOW);
  const pct = Math.round(s.ratio * 100);
  const hasDebt = s.pending > 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      aria-label="Procrastination status"
      className={cn(
        "relative overflow-hidden rounded-2xl border p-4 backdrop-blur-sm transition-colors",
        hasDebt
          ? "border-destructive/30 bg-destructive/[0.06]"
          : "border-white/10 bg-card/40",
      )}
    >
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-50"
        style={{
          background: hasDebt
            ? "radial-gradient(ellipse 100% 100% at 100% 50%, color-mix(in oklab, var(--destructive) 22%, transparent), transparent 70%)"
            : "radial-gradient(ellipse 100% 100% at 100% 50%, color-mix(in oklab, var(--primary) 22%, transparent), transparent 70%)",
        }}
        aria-hidden
      />
      <div className="relative flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {hasDebt ? (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
              </span>
            ) : (
              <Flame className="h-3.5 w-3.5 text-primary-glow" />
            )}
            {hasDebt ? "Procrastination Alert" : "On Track"}
          </p>
          <p className="mt-1 text-lg font-extrabold leading-tight tracking-tight">
            {hasDebt ? (
              <>
                {s.pending} task{s.pending === 1 ? "" : "s"} pending
                <span className="text-muted-foreground">
                  {" "}
                  over the last {WINDOW} days
                </span>
              </>
            ) : (
              <>
                Clean slate
                <span className="text-muted-foreground">
                  {" "}
                  · last {WINDOW} days cleared
                </span>
              </>
            )}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {s.completed} of {s.total} completed · {s.daysWithDebt} day
            {s.daysWithDebt === 1 ? "" : "s"} with debt
          </p>
        </div>

        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
          <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke="var(--muted)"
              strokeWidth="3"
            />
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke={hasDebt ? "var(--destructive)" : "var(--primary)"}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${(pct / 100) * 97.4} 97.4`}
            />
          </svg>
          <span className="absolute flex flex-col items-center">
            {hasDebt ? (
              <AlertCircle className="h-3.5 w-3.5 text-destructive" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            )}
            <span className="text-sm font-bold tabular-nums">{pct}%</span>
          </span>
        </div>
      </div>
    </motion.section>
  );
}
