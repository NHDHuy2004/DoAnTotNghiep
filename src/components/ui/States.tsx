import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Controls";

export function LoadingState({ label = "Đang tải dữ liệu…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-slate-500">
      <Loader2 className="animate-spin text-blue-600" size={28} />
      <p className="text-sm">{label}</p>
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
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <span className="text-slate-300">{icon ?? <Inbox size={36} />}</span>
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {description && <p className="max-w-md text-xs text-slate-400">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Đã xảy ra lỗi",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50/60 py-10 text-center">
      <AlertTriangle className="text-red-500" size={30} />
      <p className="text-sm font-semibold text-red-700">{title}</p>
      <p className="max-w-lg text-xs text-red-600">{message}</p>
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry}>
          Thử lại
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
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 py-14 text-center">
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      <p className="max-w-lg text-xs text-slate-500">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
