import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

/** Khung bề mặt dùng chung: bo góc, viền, bóng nhẹ — thống nhất toàn hệ thống. */
export function Card({
  className,
  children,
  interactive = false,
  ...props
}: {
  className?: string;
  children: ReactNode;
  /** Thẻ có thể bấm được (chứa link/nút): thêm hiệu ứng nhấc khi hover. */
  interactive?: boolean;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-line bg-surface shadow-card",
        interactive && "card-hover",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  actions,
  icon,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && (
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-grad-brand text-white shadow-[0_6px_14px_-8px_rgba(42,92,201,0.9)]">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs leading-relaxed text-ink-3">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("p-4 sm:p-5", className)}>{children}</div>;
}

export function CardFooter({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-2/60 px-4 py-3 sm:px-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Nhãn (eyebrow) nhỏ phía trên tiêu đề section — dùng khi cần phân nhóm. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-semibold tracking-[0.01em] text-ink-3">{children}</p>
  );
}
