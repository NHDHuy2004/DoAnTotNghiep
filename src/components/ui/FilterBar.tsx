import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Button } from "./Controls";

/**
 * Thanh bộ lọc thống nhất toàn hệ thống: nhóm control bên trái,
 * thông tin tóm tắt / nút đặt lại bên phải. Không dùng cho form nhập liệu.
 */
export function FilterBar({
  children,
  meta,
  onReset,
  resetLabel = "Đặt lại",
  className,
}: {
  children: ReactNode;
  /** Thông tin tóm tắt (vd: “128 kết quả”). */
  meta?: ReactNode;
  onReset?: () => void;
  resetLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end gap-x-3 gap-y-3 border-b border-line bg-surface-2/50 px-4 py-3 sm:px-5",
        className,
      )}
    >
      <div className="flex flex-1 flex-wrap items-end gap-x-3 gap-y-3">{children}</div>
      <div className="flex items-center gap-2">
        {meta && <span className="text-xs text-ink-3 tabular-nums">{meta}</span>}
        {onReset && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            {resetLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

/** Ô điều hướng kiểu segmented (trước/sau, thang xem…) — thay cho select khi chỉ có 2–3 lựa chọn. */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("inline-flex rounded-lg border border-line-2 bg-surface p-0.5", className)}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
            o.value === value
              ? "bg-ink text-white shadow-sm"
              : "text-ink-2 hover:bg-surface-2 hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
