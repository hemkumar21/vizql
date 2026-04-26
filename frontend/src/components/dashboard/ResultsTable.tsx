import { cn } from "@/lib/utils";

interface ResultsTableProps {
  columns: string[];
  rows: unknown[][];
  maxRows?: number;
  className?: string;
}

export function ResultsTable({ columns, rows, maxRows = 100, className }: ResultsTableProps) {
  if (!columns.length) return null;
  const visible = rows.slice(0, maxRows);

  return (
    <div className={cn("rounded-lg border overflow-hidden", className)}>
      <div className="overflow-x-auto overflow-y-auto max-h-72">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, ri) => (
              <tr
                key={ri}
                className="border-b last:border-0 hover:bg-accent/40 transition-colors"
              >
                {(row as unknown[]).map((cell, ci) => (
                  <td
                    key={ci}
                    className="px-3 py-2 text-xs text-foreground whitespace-nowrap font-mono"
                  >
                    {cell === null || cell === undefined
                      ? <span className="text-muted-foreground/50">—</span>
                      : typeof cell === "number"
                        ? cell.toLocaleString()
                        : String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > maxRows && (
        <div className="px-3 py-2 border-t bg-muted/30 text-xs text-muted-foreground">
          Showing {maxRows} of {rows.length} rows
        </div>
      )}
    </div>
  );
}