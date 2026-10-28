"use client";

import { cn, fmt } from "@/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

export type StatAccent = "blue" | "green" | "amber" | "red" | "gray" | "purple";

/** Chip icon gradient + màu chữ tương ứng (mỗi accent một gradient cùng sắc độ). */
const ACCENTS: Record<StatAccent, { chip: string; text: string; bar: string; glow: string }> = {
  blue: {
    chip: "bg-grad-brand text-white shadow-[0_8px_16px_-10px_rgba(42,92,201,0.95)]",
    text: "text-brand",
    bar: "from-[#3a6ee0] via-brand to-brand-2",
    glow: "bg-brand/25",
  },
  green: {
    chip: "bg-grad-success text-white shadow-[0_8px_16px_-10px_rgba(4,120,87,0.95)]",
    text: "text-success",
    bar: "from-[#16a07c] to-success",
    glow: "bg-success/25",
  },
  amber: {
    chip: "bg-grad-warning text-white shadow-[0_8px_16px_-10px_rgba(180,83,9,0.95)]",
    text: "text-warning",
    bar: "from-[#e59a33] to-warning",
    glow: "bg-warning/25",
  },
  red: {
    chip: "bg-grad-danger text-white shadow-[0_8px_16px_-10px_rgba(185,28,28,0.95)]",
    text: "text-danger",
    bar: "from-[#dc5050] to-danger",
    glow: "bg-danger/25",
  },
  gray: {
    chip: "bg-grad-ink text-white shadow-[0_8px_16px_-10px_rgba(15,23,41,0.9)]",
    text: "text-ink-2",
    bar: "from-ink-3 to-ink",
    glow: "bg-ink-3/25",
  },
  purple: {
    chip: "bg-grad-purple text-white shadow-[0_8px_16px_-10px_rgba(109,40,217,0.95)]",
    text: "text-accent",
    bar: "from-[#7d5ce0] to-accent",
    glow: "bg-accent/25",
  },
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
        "group relative flex flex-col overflow-hidden rounded-xl border border-line bg-surface p-4 shadow-card card-hover",
        className,
      )}
    >
      {/* Thanh gradient mảnh trên cùng — đổi màu theo accent */}
      <span
        aria-hidden
        className={cn("absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r", a.bar)}
      />
      {/* Quầng sáng dịu ở góc, chỉ nổi bật khi hover */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-14 -right-12 size-32 rounded-full blur-2xl transition-opacity duration-300 group-hover:opacity-100 opacity-0",
          a.glow,
        )}
      />

      <div className="relative flex items-center gap-2.5">
        {icon && (
          <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", a.chip)}>
            {icon}
          </span>
        )}
        <p
          className="min-w-0 truncate text-xs font-medium text-ink-3"
          title={typeof label === "string" ? label : undefined}
        >
          {label}
        </p>
      </div>

      <p
        className={cn(
          "relative mt-3 font-semibold tracking-[-0.03em] text-ink tabular-nums",
          emphasized ? "text-[32px] leading-9" : "text-[26px] leading-7",
        )}
      >
        {value}
      </p>

      {delta && (
        <p
          className={cn(
            "relative mt-1 inline-flex items-center gap-1 text-xs font-medium",
            good ? "text-success" : "text-danger",
          )}
        >
          {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {fmt(Math.abs(delta.value), 2)}
          {delta.unit}
        </p>
      )}

      {hint && <p className="relative mt-1 text-[11px] leading-relaxed text-ink-3">{hint}</p>}
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
