"use client";

import { useFocusTrap } from "@/hooks/useFocusTrap";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useId, useRef, type ReactNode } from "react";
import { Button } from "./Controls";

function PanelHeader({
  title,
  description,
  onClose,
  id,
}: {
  title: ReactNode;
  description?: ReactNode;
  onClose: () => void;
  id: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
      <div className="min-w-0">
        <h2 id={id} className="text-sm font-semibold text-ink">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-xs text-ink-3">{description}</p>}
      </div>
      <button
        type="button"
        aria-label="Đóng"
        onClick={onClose}
        className="-mr-1 shrink-0 rounded-md p-1.5 text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink"
      >
        <X size={16} />
      </button>
    </div>
  );
}

/**
 * Dialog có focus trap (Tab kẹt trong hộp), đóng bằng Escape hoặc bấm nền,
 * khóa cuộn trang nền và trả focus về vị trí cũ khi đóng.
 */
export function Dialog({
  open,
  title,
  description,
  onClose,
  children,
  width = "max-w-2xl",
  footer,
  className,
}: {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  width?: string;
  footer?: ReactNode;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(panelRef, open, onClose);

  if (!open) return null;
  return (
    <div
      className="anim-fade fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "anim-pop flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-pop sm:rounded-2xl",
          // Đặt TRƯỚC `width`: twMerge giữ class sau cùng, nếu để sau thì
          // max-w-[calc(100vw-1rem)] sẽ xóa mất width do prop.
          "max-w-[calc(100vw-1rem)]",
          width,
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <PanelHeader title={title} description={description} onClose={onClose} id={titleId} />
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-line bg-surface-2/60 px-4 py-3 sm:px-5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Drawer trượt từ phải — dùng cho chi tiết (entry, node, log) để người dùng
 * không phải rời khỏi bảng đang xem.
 */
export function Drawer({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  size = "max-w-xl",
}: {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(panelRef, open, onClose);

  if (!open) return null;
  return (
    <div className="anim-fade fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "anim-slide-in absolute inset-y-0 right-0 flex w-full flex-col bg-surface shadow-pop",
          // Class sau cùng thắng trong twMerge — `size` phải nằm sau.
          "max-w-[100vw]",
          size,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <PanelHeader title={title} description={description} onClose={onClose} id={titleId} />
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-line bg-surface-2/60 px-4 py-3 sm:px-5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/** Hộp thoại xác nhận (hành động quan trọng: chạy phiên mới, khôi phục…). */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog
      open={open}
      title={title}
      onClose={onCancel}
      width="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading} data-autofocus>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm leading-relaxed text-ink-2">{message}</div>
    </Dialog>
  );
}
