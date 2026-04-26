import { Clock, ChevronRight } from "lucide-react";
import { useQueryStore } from "@/store/useQueryStore";
import { cn } from "@/lib/utils";

export function QueryHistory() {
  const { history, setActiveResult } = useQueryStore();

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
        <Clock className="h-5 w-5 opacity-40" />
        <p className="text-xs">No queries yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {history.map((r, i) => {
        // pull first ~60 chars of SQL as a label
        const label = r.sql
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 64) + (r.sql.length > 64 ? "…" : "");
        const rows = r.rows.length;
        const cols = r.columns.length;

        return (
          <button
            key={i}
            onClick={() => setActiveResult(r)}
            className={cn(
              "w-full text-left rounded-lg px-3 py-2.5 border border-transparent",
              "hover:bg-accent hover:border-border transition-all duration-150",
              "flex items-start justify-between gap-2 group"
            )}
          >
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-xs font-mono text-foreground/80 truncate">{label}</span>
              <span className="text-xs text-muted-foreground">
                {rows} row{rows !== 1 ? "s" : ""} · {cols} col{cols !== 1 ? "s" : ""}
                {r.inferred_chart && ` · ${r.inferred_chart} chart`}
              </span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        );
      })}
    </div>
  );
}