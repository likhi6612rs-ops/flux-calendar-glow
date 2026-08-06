import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useFlux, buildSeries, categoryEfficiency } from "@/lib/flux-store";
import { shortLabel, lastNDayKeys } from "@/lib/flux-date";

const CATS = [
  { key: "overall", label: "Overall", color: "var(--chart-1)", width: 2.4 },
  { key: "sprint", label: "Sprints", color: "var(--chart-2)", width: 1.6 },
  { key: "longhaul", label: "Long-haul", color: "var(--chart-3)", width: 1.6 },
] as const;

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-popover/90 px-3 py-2 text-xs shadow-lg backdrop-blur-xl">
      <p className="mb-1 font-bold text-popover-foreground">{label}</p>
      {payload
        .filter((p: any) => p.value !== null && p.value !== undefined)
        .map((p: any) => (
          <p key={p.name} className="flex items-center gap-2 text-muted-foreground">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: p.color }}
            />
            {p.name}
            <span className="ml-auto font-semibold text-popover-foreground">
              {p.value}%
            </span>
          </p>
        ))}
    </div>
  );
}

export function TrendChart() {
  const { tasks, completions } = useFlux();

  const series = useMemo(
    () => buildSeries(tasks, completions, lastNDayKeys(14)),
    [tasks, completions],
  );

  const data = useMemo(
    () =>
      series.map((p) => ({
        label: shortLabel(p.key),
        overall: p.overall === null ? null : Math.round(p.overall * 100),
        sprint: p.sprint === null ? null : Math.round(p.sprint * 100),
        longhaul: p.longhaul === null ? null : Math.round(p.longhaul * 100),
      })),
    [series],
  );

  const average = useMemo(() => {
    const vals = data
      .map((d) => d.overall)
      .filter((v): v is number => typeof v === "number");
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [data]);

  const scores = useMemo(
    () => ({
      sprint: categoryEfficiency(series, "sprint"),
      standard: categoryEfficiency(series, "standard"),
      longhaul: categoryEfficiency(series, "longhaul"),
    }),
    [series],
  );

  return (
    <div className="space-y-4">
      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 14, left: -18, bottom: 0 }}>
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
              minTickGap={12}
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
              content={<ChartTooltip />}
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
            {CATS.map((c) => (
              <Line
                key={c.key}
                type="monotone"
                dataKey={c.key}
                name={c.label}
                stroke={c.color}
                strokeWidth={c.width}
                dot={{ r: 3, fill: "var(--card)", stroke: c.color, strokeWidth: 2 }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
                connectNulls
                isAnimationActive
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {(
          [
            { key: "sprint", label: "Sprint efficiency", sub: "1–3 days" },
            { key: "standard", label: "Standard", sub: "up to 1 month" },
            { key: "longhaul", label: "Long-haul", sub: "multi-month" },
          ] as const
        ).map((c) => {
          const v = scores[c.key];
          return (
            <div
              key={c.key}
              className="rounded-xl border border-border bg-card/40 p-3"
            >
              <p className="text-lg font-extrabold tracking-tight">
                {v === null ? "—" : `${Math.round(v * 100)}%`}
              </p>
              <p className="text-[11px] font-semibold leading-tight">{c.label}</p>
              <p className="text-[10px] text-muted-foreground">{c.sub}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
