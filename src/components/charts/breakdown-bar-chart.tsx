"use client";

import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatWinrate } from "@/lib/format";

export interface BreakdownDatum {
  name: string;
  winrate: number | null;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
}

function barColor(winrate: number | null): string {
  if (winrate === null) return "var(--muted)";
  if (winrate >= 60) return "#059669";
  if (winrate >= 50) return "#10b981";
  if (winrate >= 40) return "#f59e0b";
  return "#f43f5e";
}

export function BreakdownBarChart({
  data,
  emptyLabel = "Sin datos para el periodo seleccionado.",
  height = 288,
}: {
  data: BreakdownDatum[];
  emptyLabel?: string;
  height?: number;
}) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        {emptyLabel}
      </div>
    );
  }

  const chartData = data.map((entry) => ({
    ...entry,
    fill: barColor(entry.winrate),
  }));

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            horizontal={false}
          />
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(value: number) => `${value}%`}
            tickLine={false}
            axisLine={false}
            fontSize={12}
            stroke="var(--muted-foreground)"
          />
          <YAxis
            type="category"
            dataKey="name"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            width={120}
            stroke="var(--muted-foreground)"
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              fontSize: 12,
              color: "var(--popover-foreground)",
            }}
            formatter={(_value, _name, item) => {
              const payload = item?.payload as BreakdownDatum | undefined;
              return [
                `${formatWinrate(payload?.winrate ?? null)} (${payload?.wins ?? 0}-${
                  payload?.losses ?? 0
                }${payload?.draws ? `-${payload.draws}` : ""}, n=${
                  payload?.matches ?? 0
                })`,
                payload?.name ?? "",
              ];
            }}
          />
          <Bar dataKey="winrate" radius={[0, 4, 4, 0]} maxBarSize={22}>
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
