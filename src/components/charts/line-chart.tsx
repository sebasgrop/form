"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART } from "@/lib/theme";

export type Point = { label: string; value: number };

export function TrendChart({
  data,
  unit,
  height = 200,
  domainPad = 1,
  ariaLabel,
}: {
  data: Point[];
  unit: string;
  height?: number;
  domainPad?: number;
  ariaLabel: string;
}) {
  const values = data.map((d) => d.value);
  const min = Math.floor(Math.min(...values) - domainPad);
  const max = Math.ceil(Math.max(...values) + domainPad);
  return (
    <div style={{ height }} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: CHART.tick, fontSize: 11 }} minTickGap={24} />
          <YAxis
            domain={[min, max]}
            tickLine={false}
            axisLine={false}
            tick={{ fill: CHART.tick, fontSize: 11 }}
            width={48}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ stroke: CHART.cursor }}
            contentStyle={CHART.tooltip}
            labelStyle={{ color: CHART.tick }}
            formatter={(v) => [`${v} ${unit}`, ""]}
            separator=""
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={CHART.accent}
            strokeWidth={2.5}
            dot={{ r: 3, fill: CHART.accent, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: CHART.accentStrong }}
            isAnimationActive
            animationDuration={600}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
