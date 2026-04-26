import { useEffect, useState } from "react";
import {
  BarChart2, Moon, Sun, Database, TrendingUp,
  ShoppingCart, Users, RefreshCw
} from "lucide-react";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { StatCard } from "@/components/dashboard/StatCard";
import { QueryHistory } from "@/components/dashboard/QueryHistory";
import { ResultsTable } from "@/components/dashboard/ResultsTable";
import { ResultsChart } from "@/components/dashboard/ResultsChart";
import { ExplainDrawer } from "@/components/dashboard/ExplainDrawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQueryStore } from "@/store/useQueryStore";
import { fetchSchema, checkHealth } from "@/api/nlq";
import { cn } from "@/lib/utils";

type DashTab = "overview" | "table" | "history";

export default function App() {
  const { activeResult, schema, setSchema, isDark, toggleDark } = useQueryStore();
  const [tab, setTab] = useState<DashTab>("overview");
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  // Load schema + health on mount
  useEffect(() => {
    checkHealth()
      .then(() => setBackendOk(true))
      .catch(() => setBackendOk(false));

    fetchSchema()
      .then(({ tables }) => setSchema(tables))
      .catch(() => {});
  }, [setSchema]);

  // Compute quick stats from activeResult
  const totalRows = activeResult?.rows.length ?? 0;
  const numericCol = activeResult?.columns.findIndex((_, i) =>
    activeResult.rows.slice(0, 3).some((r) => typeof (r as unknown[])[i] === "number")
  ) ?? -1;
  const totalValue = numericCol >= 0 && activeResult
    ? (activeResult.rows as unknown[][]).reduce((sum, r) => sum + (Number(r[numericCol]) || 0), 0)
    : null;

  const tabs: { id: DashTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "table", label: "Data" },
    { id: "history", label: "History" },
  ];

  return (
    <div className={cn("flex h-screen overflow-hidden bg-background text-foreground", isDark && "dark")}>
      {/* ── LEFT: Dashboard ──────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 border-r overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-5 py-3 border-b bg-card shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none">NLQ Analytics</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {schema.length > 0
                  ? `${schema.length} tables · ${schema.reduce((s, t) => s + t.columns.length, 0)} columns`
                  : "Loading schema…"}
              </p>
            </div>
            {backendOk !== null && (
              <Badge variant={backendOk ? "success" : "destructive"} className="ml-1">
                {backendOk ? "Backend live" : "Backend offline"}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleDark}>
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </header>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3 px-5 py-4 shrink-0">
          <StatCard
            label="Result rows"
            value={totalRows.toLocaleString()}
            icon={<Database className="h-4 w-4" />}
            sub={activeResult ? `${activeResult.columns.length} cols` : "No query yet"}
          />
          <StatCard
            label={activeResult?.columns[numericCol] ?? "Total value"}
            value={totalValue !== null ? totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"}
            icon={<TrendingUp className="h-4 w-4" />}
            sub={activeResult?.inferred_chart ? `${activeResult.inferred_chart} chart` : undefined}
          />
          <StatCard
            label="Query type"
            value={activeResult?.explain.aggregates.length ? "Aggregate" : activeResult ? "Select" : "—"}
            icon={<ShoppingCart className="h-4 w-4" />}
            sub={activeResult ? activeResult.explain.sourceTables.join(", ") : "Ask a question"}
          />
        </div>

        {/* Tab bar */}
        <div className="flex border-b px-5 shrink-0">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px",
                tab === id
                  ? "border-primary text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === "overview" && (
            <div className="flex flex-col gap-4">
              {activeResult?.inferred_chart ? (
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                    {activeResult.inferred_chart === "bar" ? "Bar chart" : "Line chart"}
                  </p>
                  <ResultsChart
                    chartType={activeResult.inferred_chart}
                    columns={activeResult.columns}
                    rows={activeResult.rows}
                  />
                </div>
              ) : (
                !activeResult && (
                  <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground rounded-xl border border-dashed">
                    <BarChart2 className="h-8 w-8 opacity-30" />
                    <p className="text-sm">Results will appear here after your first query</p>
                  </div>
                )
              )}

              {activeResult && (
                <ExplainDrawer
                  explain={activeResult.explain}
                  sql={activeResult.sql}
                  warnings={activeResult.warnings}
                />
              )}
            </div>
          )}

          {tab === "table" && (
            <div>
              {activeResult ? (
                <ResultsTable columns={activeResult.columns} rows={activeResult.rows} />
              ) : (
                <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground rounded-xl border border-dashed">
                  <Database className="h-8 w-8 opacity-30" />
                  <p className="text-sm">No data yet</p>
                </div>
              )}
            </div>
          )}

          {tab === "history" && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
                Previous queries — click to reload
              </p>
              <QueryHistory />
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Chat ───────────────────────────────────────────────── */}
      <div className="w-[400px] shrink-0 flex flex-col overflow-hidden bg-card">
        <ChatPanel />
      </div>
    </div>
  );
}
