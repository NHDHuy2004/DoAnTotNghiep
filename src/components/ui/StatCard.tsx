"use client";

import { cn, fmt } from "@/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  accent = "blue",
  icon,
  delta,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: "blue" | "green" | "amber" | "red" | "gray" | "purple";
  icon?: ReactNode;
  /** So sánh với lần trước nếu backend cung cấp. */
  delta?: { value: number; unit?: string; goodDirection?: "up" | "down" };
}) {
  const accents: Record<string, string> = {
    blue: "border-blue-200 bg-blue-50/60 text-blue-700",
    green: "border-emerald-200 bg-emerald-50/60 text-emerald-700",
    amber: "border-amber-200 bg-amber-50/60 text-amber-700",
    red: "border-red-200 bg-red-50/60 text-red-700",
    gray: "border-slate-200 bg-slate-50/60 text-slate-600",
    purple: "border-violet-200 bg-violet-50/60 text-violet-700",
  };
  const up = (delta?.value ?? 0) >= 0;
  const good = !delta
    ? null
    : delta.goodDirection === "down"
      ? !up
      : up;

  return (
    <div className={cn("rounded-xl border p-4", accents[accent])}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        {icon && <span className="text-slate-400">{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">{value}</p>
      {delta && (
        <p
          className={cn(
            "mt-1 inline-flex items-center gap-1 text-xs font-medium",
            good ? "text-emerald-600" : "text-red-600",
          )}
        >
          {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {fmt(Math.abs(delta.value), 2)}
          {delta.unit}
        </p>
      )}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
