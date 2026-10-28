import { AlertTriangle, Construction, Inbox, Loader2, RefreshCw } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { Button } from "./Controls";
import { cn } from "@/lib/utils";

/** Vòng quay — dùng cho hành động ngắn (khởi tạo phiên, tải chi tiết). */
export function LoadingState({ label = "Đang tải dữ liệu…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 py-14 text-ink-2">
      <Loader2 className="animate-spin text-brand" size={26} />
      <p className="text-sm">{label}</p>
    </div>
  );
}

/** Dải xương khớp (skeleton) — giữ nguyên bố cục trang khi đang tải. */
export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      className={cn("shimmer rounded-md bg-surface-3", className)}
      style={style}
      aria-hidden
    />
  );
}

/** Skeleton cho hàng bảng. */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-0" role="status" aria-label="Đang tải bảng dữ liệu">
      <div className="flex gap-4 border-b border-line bg-surface-2/70 px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-line px-4 py-3.5">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn("h-3 flex-1", c === 0 && "max-w-24")} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Skeleton cho lưới thẻ thống kê. */
export function StatSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4" role="status" aria-label="Đang tải số liệu">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-line bg-surface p-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-4 h-7 w-20" />
          <Skeleton className="mt-2 h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton cho khối biểu đồ. */
export function ChartSkeleton({ height = 240 }: { height?: number }) {
  const bars = [42, 68, 35, 82, 55, 74, 48, 62];
  return (
    <div
      className="flex items-end gap-2 px-1"
      style={{ height }}
      role="status"
      aria-label="Đang tải biểu đồ"
    >
      {bars.map((h, i) => (
        <Skeleton key={i} className="flex-1" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

export function EmptyState({
  title = "Không có dữ liệu",
  description,
  action,
  icon,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="anim-fade flex flex-col items-center justify-center gap-2.5 px-4 py-14 text-center">
      <span className="relative flex size-14 items-center justify-center rounded-2xl bg-grad-brand-soft text-brand shadow-[inset_0_0_0_1px_rgba(42,92,201,0.14)]">
        <span
          aria-hidden
          className="absolute inset-0 rounded-2xl bg-grad-brand opacity-10 blur-xl"
        />
        <span className="relative">{icon ?? <Inbox size={24} />}</span>
      </span>
      <p className="text-sm font-semibold text-ink-2">{title}</p>
      {description && (
        <p className="max-w-md text-xs leading-relaxed text-ink-3">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Đã xảy ra lỗi",
  message,
  onRetry,
  retryLabel = "Thử lại",
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div
      role="alert"
      className="anim-zoom flex flex-col items-center justify-center gap-2.5 rounded-xl border border-danger-line bg-danger-soft/70 px-4 py-10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-danger-soft">
        <AlertTriangle className="text-danger" size={22} />
      </span>
      <p className="text-sm font-semibold text-danger">{title}</p>
      <p className="max-w-xl text-xs leading-relaxed text-danger/90">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-1 border-danger-line bg-surface text-danger hover:bg-danger-soft">
          <RefreshCw size={13} /> {retryLabel}
        </Button>
      )}
    </div>
  );
}

/** Trạng thái "chưa cấu hình / chưa chạy" — dùng ở Execution, DAE-List, Results. */
export function NotReadyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="anim-fade flex flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-brand-line bg-grad-brand-soft px-4 py-14 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-grad-brand text-white shadow-[0_14px_28px_-16px_rgba(42,92,201,0.95)]">
        <Construction size={24} />
      </span>
      <p className="text-sm font-semibold text-ink-2">{title}</p>
      <p className="max-w-lg text-xs leading-relaxed text-ink-3">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
