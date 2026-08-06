import { useMemo } from "react";
import { motion } from "motion/react";
import { Lock, TrendingUp, Sparkles } from "lucide-react";
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
import { useFlux, buildSeries } from "@/lib/flux-store";
import { lastNDayKeys, shortLabel } from "@/lib/flux-date";
import { usePremium, planForTier } from "@/lib/premium";
import { TrendChart } from "./TrendChart";
import { cn } from "@/lib/utils";

function ScoreTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-popover/90 px-3 py-2 text-xs shadow-lg backdrop-blur-xl">
      <p className="font-bold text-popover-foreground">{label}</p>
      <p className="text-muted-foreground">
        Completion{" "}
        <span className="font-semibold text-popover-foreground">
          {payload[0].value}%
        </span>
      </p>
    </div>
  );
}

function FocusScoreGraph() {
  const { tasks, completions, procrastination } = useFlux();
  const keys = useMemo(() => lastNDayKeys(30), []);
  const series = useMemo(
    () => buildSeries(tasks, completions, keys),
    [tasks, completions, keys],
  );

  const data = useMemo(
    () =>
      series.map((p) => ({
        label: shortLabel(p.key),
        value: Math.round((p.overall === null ? 0 : p.overall) * 100),
      })),
    [series],
  );

  const average = useMemo(() => {
    if (!data.length) return null;
    return Math.round(data.reduce((a, b) => a + b.value, 0) / data.length);
  }, [data]);

  const summary = procrastination(30);
  const score = Math.round(summary.ratio * 100);

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
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 14, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="focusFill" x1="0" y1="0" x2="0" y2="1">
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
              minTickGap={14}
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
              cursor={{ stroke: "var(--primary)", strokeWidth: 1, strokeDasharray: "4 4" }}
              content={<ScoreTooltip />}
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
              fill="url(#focusFill)"
              dot={{ r: 2.5, fill: "var(--card)", stroke: "var(--primary)", strokeWidth: 2 }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function InsightsView() {
  const { hasTier, openPaywall } = usePremium();
  const unlocked = hasTier("pro");
  const proPlan = planForTier("pro");

  return (
    <div className="relative">
      <div className="mb-5">
        <h2 className="text-xl font-extrabold tracking-tight">
          Productivity Insights
        </h2>
        <p className="text-xs text-muted-foreground">
          30-day procrastination analytics & execution consistency.
        </p>
      </div>

      <div
        className={cn(
          "space-y-5 transition-all duration-500",
          !unlocked && "pointer-events-none select-none blur-md",
        )}
        aria-hidden={!unlocked}
      >
        <FocusScoreGraph />
        <div className="rounded-2xl border border-white/10 bg-card/40 p-4 backdrop-blur-sm">
          <h3 className="mb-3 text-sm font-bold">Consistency Trend · 14 days</h3>
          <TrendChart />
        </div>
      </div>

      {!unlocked && (
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
              30-Day Procrastination Analytics
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              See your 30-day Focus Score, slip-day patterns, and consistency
              trends.
            </p>
            <p className="mt-3 text-sm font-semibold">
              {proPlan.name} · ₹{proPlan.inr}
              <span className="text-muted-foreground"> / month</span>
            </p>
            <button
              type="button"
              onClick={() => openPaywall("Procrastination Analytics", "pro")}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary-glow py-3 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98]"
            >
              <Sparkles className="h-4 w-4" /> Unlock {proPlan.name}
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
