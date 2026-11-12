"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { TrendPoint } from "@/lib/db/types";
import { formatWinrate } from "@/lib/format";

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
});

export function WinrateTrendChart({ data }: { data: TrendPoint[] }) {
  const chartData = data.map((point) => ({
    label: dateFormatter.format(new Date(point.bucket)),
    winrate: point.winrate,
    matches: point.matches,
    wins: point.wins,
    losses: point.losses,
    draws: point.draws,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Sin datos para el periodo seleccionado.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 8, right: 12, bottom: 0, left: -16 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            stroke="var(--muted-foreground)"
            minTickGap={16}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(value: number) => `${value}%`}
            tickLine={false}
            axisLine={false}
            fontSize={12}
            width={44}
            stroke="var(--muted-foreground)"
          />
          <Tooltip
            cursor={{ stroke: "var(--border)" }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              fontSize: 12,
              color: "var(--popover-foreground)",
            }}
            formatter={(value, _name, item) => {
              const payload = item?.payload as
                | { matches: number; wins: number; losses: number; draws: number }
                | undefined;
              if (value === null || value === undefined) {
                return ["—", "Winrate"];
              }
              return [
                `${formatWinrate(value as number)} (${payload?.wins ?? 0}-${payload?.losses ?? 0}${
                  payload?.draws ? `-${payload.draws}` : ""
                }, n=${payload?.matches ?? 0})`,
                "Winrate",
              ];
            }}
          />
          <Line
            type="monotone"
            dataKey="winrate"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 3, fill: "#10b981" }}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
