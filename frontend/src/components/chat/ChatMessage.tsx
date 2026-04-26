import { useState } from "react";
import { ChevronDown, ChevronUp, BarChart2, Table, Code2, AlertCircle } from "lucide-react";
import { ChatBubble, ChatBubbleAvatar, ChatBubbleMessage } from "@/components/ui/chat-bubble";
import { ResultsChart } from "@/components/dashboard/ResultsChart";
import { ResultsTable } from "@/components/dashboard/ResultsTable";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/types";

interface ChatMessageProps {
  message: ChatMessageType;
}

type Tab = "chart" | "table" | "sql";

export function ChatMessage({ message }: ChatMessageProps) {
  const [tab, setTab] = useState<Tab>("chart");
  const [explainOpen, setExplainOpen] = useState(false);
  const r = message.result;

  if (message.role === "user") {
    return (
      <ChatBubble variant="sent">
        <ChatBubbleMessage variant="sent" className="text-sm">
          {message.content}
        </ChatBubbleMessage>
        <ChatBubbleAvatar fallback="U" className="bg-primary/10" />
      </ChatBubble>
    );
  }

  if (message.role === "error") {
    return (
      <ChatBubble variant="received">
        <ChatBubbleAvatar fallback="!" className="bg-destructive/10" />
        <ChatBubbleMessage variant="received" className="text-sm border border-destructive/20">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <span className="text-destructive">{message.content}</span>
          </div>
        </ChatBubbleMessage>
      </ChatBubble>
    );
  }

  // Assistant message
  return (
    <ChatBubble variant="received">
      <ChatBubbleAvatar fallback="AI" className="bg-primary/10" />
      <div className="flex flex-col gap-2 max-w-[90%]">
        {/* Narration */}
        {message.content && (
          <ChatBubbleMessage variant="received" className="text-sm">
            {message.content}
          </ChatBubbleMessage>
        )}

        {/* Result card */}
        {r && (
          <div className="rounded-xl border bg-card overflow-hidden shadow-sm animate-fade-in">
            {/* Stat strip */}
            <div className="flex items-center gap-3 px-3 py-2 bg-muted/40 border-b text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{r.rows.length} rows</span>
              <span>·</span>
              <span>{r.columns.length} columns</span>
              {r.inferred_chart && (
                <>
                  <span>·</span>
                  <Badge variant="secondary" className="h-4 text-[10px] px-1.5">
                    {r.inferred_chart}
                  </Badge>
                </>
              )}
            </div>

            {/* Tab bar */}
            <div className="flex border-b">
              {([
                r.inferred_chart ? { id: "chart" as Tab, icon: <BarChart2 className="h-3.5 w-3.5" />, label: "Chart" } : null,
                { id: "table" as Tab, icon: <Table className="h-3.5 w-3.5" />, label: "Table" },
                { id: "sql" as Tab, icon: <Code2 className="h-3.5 w-3.5" />, label: "SQL" },
              ].filter(Boolean) as { id: Tab; icon: JSX.Element; label: string }[]).map(({ id, icon, label }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-xs transition-colors border-b-2",
                    tab === id
                      ? "border-primary text-foreground font-medium"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {icon}{label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-3">
              {tab === "chart" && r.inferred_chart && (
                <ResultsChart
                  chartType={r.inferred_chart}
                  columns={r.columns}
                  rows={r.rows}
                  compact
                />
              )}
              {tab === "table" && (
                <ResultsTable columns={r.columns} rows={r.rows} maxRows={20} />
              )}
              {tab === "sql" && (
                <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto text-foreground">
                  <code>{r.sql}</code>
                </pre>
              )}
            </div>

            {/* Explain toggle */}
            {r.explain?.naturalExplanation && (
              <div className="border-t">
                <button
                  onClick={() => setExplainOpen(!explainOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs text-muted-foreground hover:bg-accent/40 transition-colors"
                >
                  <span>{r.explain.naturalExplanation}</span>
                  {explainOpen ? <ChevronUp className="h-3.5 w-3.5 shrink-0 ml-2" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0 ml-2" />}
                </button>
                {explainOpen && (
                  <div className="px-3 pb-3 flex flex-wrap gap-1.5 animate-fade-in">
                    {r.explain.sourceTables.map((t) => (
                      <code key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300 font-mono">{t}</code>
                    ))}
                    {r.explain.filters.map((f, i) => (
                      <code key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 font-mono">{f}</code>
                    ))}
                    {r.explain.groupBy.map((g, i) => (
                      <code key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300 font-mono">GROUP {g}</code>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </ChatBubble>
  );
}
