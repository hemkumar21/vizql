import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Send, Loader2 } from "lucide-react";
import { ChatInput } from "@/components/ui/chat-input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QueryInputProps {
  onSubmit: (prompt: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

const EXAMPLE_QUERIES = [
  "Revenue by region in Q2 2024",
  "Top 5 customers by spend",
  "Monthly revenue trend 2024",
  "Orders by product line",
];

export function QueryInput({ onSubmit, isLoading, placeholder, className }: QueryInputProps) {
  const [value, setValue] = useState("");

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSubmit(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Example chips — only when empty */}
      {!value && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {EXAMPLE_QUERIES.map((q) => (
            <button
              key={q}
              onClick={() => setValue(q)}
              className="text-xs px-2.5 py-1 rounded-full border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="relative rounded-xl border bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 transition-all"
      >
        <ChatInput
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? "Ask anything about your data…"}
          className="min-h-[52px] resize-none rounded-xl border-0 bg-transparent p-3 pr-14 shadow-none focus-visible:ring-0 text-sm"
          disabled={isLoading}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!value.trim() || isLoading}
          className="absolute right-2 bottom-2 h-8 w-8 rounded-lg"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>

      <p className="text-[10px] text-muted-foreground px-1">
        Press <kbd className="rounded border px-1 py-0.5 text-[10px] font-mono bg-muted">Enter</kbd> to send &nbsp;·&nbsp; <kbd className="rounded border px-1 py-0.5 text-[10px] font-mono bg-muted">Shift+Enter</kbd> for new line
      </p>
    </div>
  );
}