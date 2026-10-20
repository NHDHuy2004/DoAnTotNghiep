import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Variant = "blue" | "green" | "amber" | "red" | "gray" | "purple";

const styles: Record<Variant, string> = {
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-red-50 text-red-700 border-red-200",
  gray: "bg-slate-50 text-slate-600 border-slate-200",
  purple: "bg-violet-50 text-violet-700 border-violet-200",
};

export function Badge({
  variant = "gray",
  className,
  children,
}: {
  variant?: Variant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        styles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Badge trạng thái chung: đang chạy / hoàn thành / lỗi / chờ / bị loại… */
export function StatusBadge({
  status,
}: {
  status:
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
    | "demo";
}) {
  const map: Record<typeof status, { label: string; variant: Variant }> = {
    pending: { label: "Chưa chạy", variant: "gray" },
    running: { label: "Đang chạy", variant: "amber" },
    done: { label: "Hoàn thành", variant: "green" },
    error: { label: "Lỗi", variant: "red" },
    stopped: { label: "Đã dừng", variant: "gray" },
    candidate: { label: "Ứng viên", variant: "blue" },
    eliminated: { label: "Bị loại", variant: "red" },
    haei: { label: "HAEI", variant: "green" },
    "not-haei": { label: "Không đạt", variant: "red" },
    connected: { label: "Đã kết nối", variant: "green" },
    unreachable: { label: "Mất kết nối", variant: "red" },
    demo: { label: "DEMO", variant: "purple" },
  };
  const cfg = map[status];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
