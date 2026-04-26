import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: number;       // positive = green, negative = red
  icon?: ReactNode;
  className?: string;
}

export function StatCard({ label, value, sub, trend, icon, className }: StatCardProps) {
  return (
    <div className={cn(
      "rounded-xl border bg-card p-4 flex flex-col gap-2 transition-all duration-200 hover:shadow-md",
      className
    )}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <p className="text-2xl font-semibold text-foreground leading-none">{value}</p>
      <div className="flex items-center gap-2">
        {trend !== undefined && (
          <span className={cn(
            "text-xs font-medium px-1.5 py-0.5 rounded-full",
            trend >= 0
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
          )}>
            {trend >= 0 ? "+" : ""}{trend}%
          </span>
        )}
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}
