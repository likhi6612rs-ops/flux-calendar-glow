import { useMemo } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useFlux, buildSeries, categoryEfficiency } from "@/lib/flux-store";
import { shortLabel, lastNDayKeys } from "@/lib/flux-date";

const CATS = [
  { key: "overall", label: "Overall", color: "var(--chart-1)", width: 2.6 },
  { key: "sprint", label: "Sprints", color: "var(--chart-2)", width: 1.6 },
  { key: "longhaul", label: "Long-haul", color: "var(--chart-3)", width: 1.6 },
] as const;

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
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval={2}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              cursor={{ stroke: "var(--primary)", strokeWidth: 1 }}
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                fontSize: 12,
                color: "var(--popover-foreground)",
              }}
              formatter={(v: number, name) => [`${v}%`, name]}
            />
            {CATS.map((c) => (
              <Line
                key={c.key}
                type="monotone"
                dataKey={c.key}
                name={c.label}
                stroke={c.color}
                strokeWidth={c.width}
                dot={false}
                activeDot={{ r: 4 }}
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
