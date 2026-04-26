import { useState } from "react";
import { ChevronDown, ChevronUp, Filter, Group, Hash, Table2, Lightbulb } from "lucide-react";
import type { ExplainObject } from "@/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ExplainDrawerProps {
  explain: ExplainObject;
  sql: string;
  warnings?: string[];
  className?: string;
}

function Section({ icon, label, items, color }: {
  icon: React.ReactNode;
  label: string;
  items: string[];
  color: string;
}) {
  if (!items.length) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <code key={i} className={cn("text-xs px-2 py-0.5 rounded-md font-mono", color)}>
            {item}
          </code>
        ))}
      </div>
    </div>
  );
}

export function ExplainDrawer({ explain, sql, warnings, className }: ExplainDrawerProps) {
  const [open, setOpen] = useState(false);
  const [showSQL, setShowSQL] = useState(false);

  const hasContent =
    explain.filters.length ||
    explain.groupBy.length ||
    explain.aggregates.length ||
    explain.sourceTables.length;

  return (
    <div className={cn("rounded-xl border bg-card overflow-hidden", className)}>
      {/* Header — always visible */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium">How this query was built</span>
          {warnings && warnings.length > 0 && (
            <Badge variant="warning">{warnings.length} warning{warnings.length > 1 ? "s" : ""}</Badge>
          )}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {/* Natural explanation — always visible if present */}
      {explain.naturalExplanation && (
        <p className="px-4 pb-3 text-sm text-muted-foreground leading-relaxed">
          {explain.naturalExplanation}
        </p>
      )}

      {/* Collapsible detail */}
      {open && (
        <div className="px-4 pb-4 flex flex-col gap-4 border-t pt-3 animate-fade-in">
          {hasContent ? (
            <>
              <Section
                icon={<Filter className="h-3.5 w-3.5" />}
                label="Filters"
                items={explain.filters}
                color="bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
              />
              <Section
                icon={<Group className="h-3.5 w-3.5" />}
                label="Group by"
                items={explain.groupBy}
                color="bg-purple-50 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300"
              />
              <Section
                icon={<Hash className="h-3.5 w-3.5" />}
                label="Aggregates"
                items={explain.aggregates}
                color="bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300"
              />
              <Section
                icon={<Table2 className="h-3.5 w-3.5" />}
                label="Source tables"
                items={explain.sourceTables}
                color="bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
              />
            </>
          ) : (
            <p className="text-xs text-muted-foreground">No provenance details available.</p>
          )}

          {warnings && warnings.length > 0 && (
            <div className="flex flex-col gap-1">
              {warnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded px-2 py-1">{w}</p>
              ))}
            </div>
          )}

          {/* SQL toggle */}
          <div>
            <button
              onClick={() => setShowSQL(!showSQL)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              {showSQL ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showSQL ? "Hide" : "Show"} SQL
            </button>
            {showSQL && (
              <pre className="mt-2 text-xs bg-muted rounded-lg p-3 overflow-x-auto text-foreground">
                <code>{sql}</code>
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
