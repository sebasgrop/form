"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART } from "@/lib/theme";

export function StackedSetsChart({
  data,
  ariaLabel,
  height = 220,
}: {
  data: { label: string; principal: number; accesorio: number }[];
  ariaLabel: string;
  height?: number;
}) {
  return (
    <div style={{ height }} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: CHART.tick, fontSize: 11 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: CHART.tick, fontSize: 11 }} width={48} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: CHART.cursorFill }}
            contentStyle={CHART.tooltip}
            labelStyle={{ color: CHART.tick }}
            formatter={(v, name) => [`${v} series`, name as string]}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: CHART.tick }} />
          <Bar dataKey="principal" name="Principales" stackId="s" fill={CHART.accentStrong} maxBarSize={32} animationDuration={600} />
          <Bar dataKey="accesorio" name="Accesorias" stackId="s" fill={CHART.accentLight} radius={[6, 6, 0, 0]} maxBarSize={32} animationDuration={600} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
