import { useMemo } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useFlux, recentRatios } from "@/lib/flux-store";
import { shortLabel } from "@/lib/flux-date";

export function TrendChart() {
  const { days } = useFlux();

  const data = useMemo(
    () =>
      recentRatios(days, 14).map((d) => ({
        label: shortLabel(d.key),
        value: Math.round(d.ratio * 100),
        hasData: d.hasData,
      })),
    [days],
  );

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id="fluxArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.63 0.13 295)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="oklch(0.63 0.13 295)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            tick={{ fill: "oklch(0.66 0.015 290)", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval={2}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "oklch(0.66 0.015 290)", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            cursor={{ stroke: "oklch(0.63 0.13 295)", strokeWidth: 1 }}
            contentStyle={{
              background: "oklch(0.2 0.01 290)",
              border: "1px solid oklch(0.32 0.012 290)",
              borderRadius: 12,
              fontSize: 12,
              color: "oklch(0.95 0.005 290)",
            }}
            formatter={(v: number) => [`${v}%`, "Consistency"]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="oklch(0.74 0.09 295)"
            strokeWidth={2.5}
            fill="url(#fluxArea)"
            dot={{ r: 2.5, fill: "oklch(0.74 0.09 295)" }}
            activeDot={{ r: 5 }}
            isAnimationActive
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
