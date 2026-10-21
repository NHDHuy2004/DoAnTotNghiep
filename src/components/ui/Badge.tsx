import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Biến thể màu — NGỮ NGHĨA CỐ ĐỊNH xuyên suốt hệ thống:
 * blue (brand) = thông tin/đang xử lý · green = đạt/hợp lệ · amber = cảnh báo/chờ ·
 * red = lỗi/không đạt · gray = trung tính · purple = chỉ dành cho nhãn DEMO ·
 * info = thông tin phụ.
 */
export type BadgeVariant = "blue" | "green" | "amber" | "red" | "gray" | "purple" | "info";

const styles: Record<BadgeVariant, string> = {
  blue: "bg-brand-soft text-brand border-brand-line",
  green: "bg-success-soft text-success border-success-line",
  amber: "bg-warning-soft text-warning border-warning-line",
  red: "bg-danger-soft text-danger border-danger-line",
  gray: "bg-surface-2 text-ink-2 border-line",
  purple: "bg-accent-soft text-accent border-accent-line",
  info: "bg-info-soft text-info border-info-line",
};

export function Badge({
  variant = "gray",
  className,
  children,
  title,
}: {
  variant?: BadgeVariant;
  className?: string;
  children: ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] leading-5 font-medium whitespace-nowrap",
        styles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Chấm trạng thái nhỏ (dùng trong badge và header pha). */
export function Dot({ className }: { className?: string }) {
  return <span className={cn("size-1.5 shrink-0 rounded-full bg-current", className)} />;
}

export type StatusKey =
  | "pending"
  | "running"
  | "done"
  | "error"
  | "stopped"
  | "candidate"
  | "eliminated"
  | "haei"
  | "not-haei"
  | "connected"
  | "unreachable"
  | "checking"
  | "demo";

/** Badge trạng thái chung: đang chạy / hoàn thành / lỗi / chờ / bị loại… */
export function StatusBadge({ status, withDot = false }: { status: StatusKey; withDot?: boolean }) {
  const map: Record<StatusKey, { label: string; variant: BadgeVariant; title?: string }> = {
    pending: { label: "Chưa chạy", variant: "gray" },
    running: { label: "Đang chạy", variant: "amber" },
    done: { label: "Hoàn thành", variant: "green" },
    error: { label: "Lỗi", variant: "red" },
    stopped: { label: "Đã dừng", variant: "gray" },
    candidate: { label: "Ứng viên", variant: "blue" },
    eliminated: { label: "Bị loại", variant: "red" },
    haei: { label: "HAEI", variant: "green", title: "Đạt ngưỡng: Sdae ≥ minae" },
    "not-haei": { label: "Không đạt", variant: "red", title: "Sdae < minae" },
    connected: { label: "Đã kết nối", variant: "green" },
    unreachable: { label: "Mất kết nối", variant: "red" },
    checking: { label: "Đang kiểm tra", variant: "gray" },
    demo: { label: "DEMO", variant: "purple" },
  };
  const cfg = map[status];
  return (
    <Badge variant={cfg.variant} title={cfg.title}>
      {withDot && <Dot />}
      {cfg.label}
    </Badge>
  );
}
