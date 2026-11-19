"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART } from "@/lib/theme";

export function DailyBars({
  data,
  target,
  unit,
  ariaLabel,
  height = 180,
}: {
  data: { label: string; value: number }[];
  target?: number;
  unit: string;
  ariaLabel: string;
  height?: number;
}) {
  return (
    <div style={{ height }} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: CHART.tick, fontSize: 11 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: CHART.tick, fontSize: 11 }} width={48} />
          <Tooltip
            cursor={{ fill: CHART.cursorFill }}
            contentStyle={CHART.tooltip}
            labelStyle={{ color: CHART.tick }}
            formatter={(v) => [`${v} ${unit}`, ""]}
            separator=""
          />
          {target != null && <ReferenceLine y={target} stroke={CHART.reference} strokeDasharray="4 4" />}
          <Bar dataKey="value" fill={CHART.accent} radius={[6, 6, 0, 0]} maxBarSize={28} animationDuration={600} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
