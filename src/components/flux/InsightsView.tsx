import { useMemo } from "react";
import { motion } from "motion/react";
import { Lock, TrendingUp, Sparkles } from "lucide-react";
import { useFlux, buildSeries } from "@/lib/flux-store";
import { lastNDayKeys } from "@/lib/flux-date";
import { usePremium, PREMIUM_PRICE, PREMIUM_CYCLE } from "@/lib/premium";
import { TrendChart } from "./TrendChart";
import { cn } from "@/lib/utils";

function FocusScoreGraph() {
  const { tasks, completions, procrastination } = useFlux();
  const keys = useMemo(() => lastNDayKeys(30), []);
  const series = useMemo(
    () => buildSeries(tasks, completions, keys),
    [tasks, completions, keys],
  );

  const points = series.map((p) => (p.overall === null ? 0 : p.overall));
  const summary = procrastination(30);
  const score = Math.round(summary.ratio * 100);

  const w = 320;
  const h = 90;
  const step = points.length > 1 ? w / (points.length - 1) : w;
  const coords = points.map((v, i) => [i * step, h - v * h] as const);
  const linePath = coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L${w},${h} L0,${h} Z`;

  return (
    <div className="rounded-2xl border border-white/10 bg-card/40 p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5 text-primary-glow" /> 30-Day Focus
            Score
          </p>
          <p className="mt-1 text-3xl font-extrabold tracking-tight">{score}</p>
        </div>
        <p className="text-right text-xs text-muted-foreground">
          {summary.completed}/{summary.total} done
          <br />
          {summary.daysWithDebt} slip days
        </p>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-24 w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="focusFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#focusFill)" />
        <path
          d={linePath}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function InsightsView() {
  const { isPremium, openPaywall } = usePremium();

  return (
    <div className="relative">
      <div className="mb-5">
        <h2 className="text-xl font-extrabold tracking-tight">
          Productivity Insights
        </h2>
        <p className="text-xs text-muted-foreground">
          Deep analytics on your execution consistency.
        </p>
      </div>

      <div
        className={cn(
          "space-y-5 transition-all duration-500",
          !isPremium && "pointer-events-none select-none blur-md",
        )}
        aria-hidden={!isPremium}
      >
        <FocusScoreGraph />
        <div className="rounded-2xl border border-white/10 bg-card/40 p-4 backdrop-blur-sm">
          <h3 className="mb-3 text-sm font-bold">Consistency Trend · 14 days</h3>
          <TrendChart />
        </div>
      </div>

      {!isPremium && (
        <div className="absolute inset-0 flex items-center justify-center p-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-xs rounded-3xl border border-white/10 bg-card/60 p-6 text-center shadow-glow backdrop-blur-2xl"
            style={{ ["--glow-color" as string]: "oklch(0.74 0.12 300 / 40%)" }}
          >
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow">
              <Lock className="h-6 w-6 text-primary-foreground" />
            </div>
            <h3 className="text-lg font-extrabold tracking-tight">
              Unlock Your Productivity Insights
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              See your 30-day Focus Score, slip-day patterns, and consistency
              trends.
            </p>
            <p className="mt-3 text-sm font-semibold">
              {PREMIUM_PRICE}
              <span className="text-muted-foreground">/{PREMIUM_CYCLE}</span>
            </p>
            <button
              type="button"
              onClick={() => openPaywall("Productivity Insights")}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary-glow py-3 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98]"
            >
              <Sparkles className="h-4 w-4" /> Go Premium
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
