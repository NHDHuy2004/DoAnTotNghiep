"use client";

import { cn, fmt } from "@/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

export type StatAccent = "blue" | "green" | "amber" | "red" | "gray" | "purple";

const ACCENTS: Record<StatAccent, { chip: string; text: string }> = {
  blue: { chip: "bg-brand-soft text-brand", text: "text-brand" },
  green: { chip: "bg-success-soft text-success", text: "text-success" },
  amber: { chip: "bg-warning-soft text-warning", text: "text-warning" },
  red: { chip: "bg-danger-soft text-danger", text: "text-danger" },
  gray: { chip: "bg-surface-3 text-ink-2", text: "text-ink-2" },
  purple: { chip: "bg-accent-soft text-accent", text: "text-accent" },
};

/**
 * Thẻ thống kê: bo góc trắng đồng nhất, icon nền mềm, giá trị số lớn,
 * nhãn & chú thích phân cấp rõ — chỉ dùng màu làm điểm nhấn, không tô cả card.
 */
export function StatCard({
  label,
  value,
  hint,
  accent = "blue",
  icon,
  delta,
  className,
  emphasized = false,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: StatAccent;
  icon?: ReactNode;
  /** So sánh với lần trước nếu backend cung cấp. */
  delta?: { value: number; unit?: string; goodDirection?: "up" | "down" };
  className?: string;
  /** Card chỉ số quan trọng: số lớn hơn một cấp. */
  emphasized?: boolean;
}) {
  const a = ACCENTS[accent];
  const up = (delta?.value ?? 0) >= 0;
  const good = !delta ? null : delta.goodDirection === "down" ? !up : up;

  return (
    <div
      className={cn(
        "flex flex-col rounded-card border border-line bg-surface p-4 shadow-card",
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        {icon && (
          <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", a.chip)}>
            {icon}
          </span>
        )}
        <p className="min-w-0 truncate text-xs font-medium text-ink-3" title={typeof label === "string" ? label : undefined}>
          {label}
        </p>
      </div>

      <p
        className={cn(
          "mt-3 font-semibold tracking-tight text-ink tabular-nums",
          emphasized ? "text-[28px] leading-8" : "text-2xl leading-7",
        )}
      >
        {value}
      </p>

      {delta && (
        <p
          className={cn(
            "mt-1 inline-flex items-center gap-1 text-xs font-medium",
            good ? "text-success" : "text-danger",
          )}
        >
          {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {fmt(Math.abs(delta.value), 2)}
          {delta.unit}
        </p>
      )}

      {hint && <p className="mt-1 text-[11px] leading-relaxed text-ink-3">{hint}</p>}
    </div>
  );
}

/**
 * Hàng thống kê phụ dạng “từ khóa – giá trị” (dùng khi không muốn thêm
 * nhiều card nữa, giữ bố cục thoáng).
 */
export function StatInline({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="min-w-0 px-4 py-3">
      <p className="truncate text-[11px] font-medium text-ink-3">{label}</p>
      <p className="mt-0.5 truncate text-base font-semibold text-ink tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 truncate text-[11px] text-ink-3">{hint}</p>}
    </div>
  );
}
