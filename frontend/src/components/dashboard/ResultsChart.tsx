import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import type { ChartDataPoint } from "@/types";
import { cn } from "@/lib/utils";

interface ResultsChartProps {
  chartType: "bar" | "line";
  columns: string[];
  rows: unknown[][];
  className?: string;
  compact?: boolean;     // shorter height for inline chat messages
}

// Convert raw columns + rows into Recharts data array
function toChartData(columns: string[], rows: unknown[][]): { data: ChartDataPoint[]; numericKeys: string[] } {
  const numericKeys: string[] = [];
  const labelKey = columns[0];

  columns.forEach((col, i) => {
    if (i === 0) return;
    const sample = rows.slice(0, 5).map((r) => (r as unknown[])[i]);
    if (sample.some((v) => typeof v === "number")) numericKeys.push(col);
  });

  const data: ChartDataPoint[] = rows.map((row) => {
    const r = row as unknown[];
    const point: ChartDataPoint = { name: String(r[0] ?? "") };
    columns.forEach((col, i) => {
      if (i === 0) return;
      const val = r[i];
      point[col] = typeof val === "number" ? val : parseFloat(String(val)) || 0;
    });
    return point;
  });

  return { data, numericKeys: numericKeys.length ? numericKeys : [columns[1]] };
}

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
  color: "hsl(var(--foreground))",
};

export function ResultsChart({ chartType, columns, rows, className, compact = false }: ResultsChartProps) {
  if (!columns.length || !rows.length) return null;

  const { data, numericKeys } = toChartData(columns, rows);
  const height = compact ? 180 : 260;

  const sharedProps = {
    data,
    margin: { top: 4, right: 8, left: 0, bottom: 4 },
  };

  const axisStyle = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {chartType === "bar" ? (
          <BarChart {...sharedProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => typeof v === "number" && v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--accent))" }} />
            {numericKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
            {numericKeys.map((key, i) => (
              <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} maxBarSize={60} />
            ))}
          </BarChart>
        ) : (
          <LineChart {...sharedProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => typeof v === "number" && v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
            <Tooltip contentStyle={tooltipStyle} />
            {numericKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
            {numericKeys.map((key, i) => (
              <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}