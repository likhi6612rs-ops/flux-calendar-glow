import { useEffect, useMemo, useRef } from "react";
import confetti from "canvas-confetti";
import { motion } from "motion/react";
import { TrendingUp, TrendingDown, Minus, RefreshCw, Lock } from "lucide-react";
import {
  useFlux,
  buildSeries,
  classifyTrend,
  type Trend,
} from "@/lib/flux-store";
import { getMonthInfo, lastNDayKeys } from "@/lib/flux-date";
import { cn } from "@/lib/utils";

const BADGES = [
  { days: 3, name: "Spark", emoji: "✨" },
  { days: 7, name: "Momentum", emoji: "🔥" },
  { days: 14, name: "Velocity", emoji: "📈" },
  { days: 21, name: "Flow State", emoji: "🌊" },
];

function fireConfetti() {
  const colors = ["#B39DDB", "#9575CD", "#7E57C2", "#ffffff"];
  confetti({ particleCount: 90, spread: 70, origin: { y: 0.35 }, colors });
  setTimeout(
    () =>
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.4 },
        colors,
      }),
    150,
  );
  setTimeout(
    () =>
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.4 },
        colors,
      }),
    300,
  );
}

export function CelebrationEngine({ active }: { active: boolean }) {
  const { tasks, completions, isDayComplete } = useFlux();
  const firedRef = useRef(false);

  const trend: Trend = useMemo(() => {
    const series = buildSeries(tasks, completions, lastNDayKeys(7));
    return classifyTrend(
      series
        .map((s) => s.overall)
        .filter((v): v is number => typeof v === "number"),
    );
  }, [tasks, completions]);

  const completedDays = useMemo(() => {
    const month = getMonthInfo();
    return month.dayKeys.filter((key) => isDayComplete(key)).length;
  }, [isDayComplete]);

  useEffect(() => {
    if (active && trend === "up" && !firedRef.current) {
      firedRef.current = true;
      fireConfetti();
    }
    if (!active) firedRef.current = false;
  }, [active, trend]);

  return (
    <div className="space-y-5">
      {trend === "up" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-success/40 bg-success/10 p-5 glow-soft"
        >
          <div className="flex items-center gap-2 text-primary-glow">
            <TrendingUp className="h-5 w-5" />
            <span className="font-bold">Velocity rising 📈</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Your consistency is trending upward week-over-week. Keep the
            momentum flowing.
          </p>
        </motion.div>
      )}

      {trend === "down" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card/60 p-5"
        >
          <div className="flex items-center gap-2 text-foreground">
            <RefreshCw className="h-5 w-5 text-primary" />
            <span className="font-bold">Focus Reset</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            A gentle dip — no pressure. Recalculate. Pick two small objectives
            for tomorrow and rebuild your rhythm.
          </p>
        </motion.div>
      )}

      {trend === "flat" && (
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card/40 p-5 text-sm text-muted-foreground">
          <Minus className="h-4 w-4 text-primary" />
          Holding steady — complete tasks across days to chart your trend.
        </div>
      )}

      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
          Milestone Badges · {completedDays} day
          {completedDays === 1 ? "" : "s"} cleared this month
        </h3>
        <div className="grid grid-cols-4 gap-2.5">
          {BADGES.map((b) => {
            const unlocked = completedDays >= b.days;
            return (
              <div
                key={b.name}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-colors",
                  unlocked
                    ? "border-primary/50 bg-primary/10 glow-soft"
                    : "border-border bg-card/30 opacity-60",
                )}
              >
                <span className="text-xl">{unlocked ? b.emoji : ""}</span>
                {!unlocked && (
                  <Lock className="h-4 w-4 text-muted-foreground/60" />
                )}
                <span className="text-[11px] font-semibold">{b.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {b.days}d
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {trend !== "down" && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
          {trend === "up" ? (
            <TrendingUp className="h-3.5 w-3.5" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5" />
          )}
          Trend is computed from your last 7 days of completion ratios.
        </div>
      )}
    </div>
  );
}
