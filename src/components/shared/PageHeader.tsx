"use client";

import { Badge } from "@/components/ui/Badge";
import { FlaskConical } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Đầu trang: tiêu đề + mô tả + hành động chính.
 * Mọi trang đều bắt đầu bằng PageHeader để nhịp bố cục thống nhất.
 */
export function PageHeader({
  title,
  description,
  actions,
  badges,
}: {
  title: string;
  description?: ReactNode;
  /** Hành động chính của trang — ưu tiên tối đa 2–3 nút. */
  actions?: ReactNode;
  /** Badge ngữ cảnh (ngưỡng, phiên hiện tại…). */
  badges?: ReactNode;
}) {
  return (
    <div className="anim-rise relative mb-5 overflow-hidden rounded-2xl border border-line bg-white/75 px-4 py-4 shadow-card backdrop-blur-sm sm:px-6 sm:py-5">
      {/* Nền: lưới kỹ thuật + quầng sáng gradient — chỉ trang trí, không ảnh hưởng đọc */}
      <span aria-hidden className="grid-pattern pointer-events-none absolute inset-0 opacity-80" />
      <span
        aria-hidden
        className="pointer-events-none absolute -top-28 -right-20 size-64 rounded-full bg-grad-brand opacity-[0.12] blur-3xl"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-16 size-56 rounded-full bg-grad-success opacity-[0.08] blur-3xl"
      />

      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              aria-hidden
              className="h-5 w-1 shrink-0 rounded-full bg-grad-brand shadow-[0_0_10px_rgba(37,99,235,0.6)]"
            />
            <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">{title}</h1>
            {badges}
          </div>
          {description && (
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-2">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  );
}

/** Nhãn nguồn dữ liệu — bắt buộc hiển thị khi đang ở DEMO mode. */
export function DemoBanner({ source }: { source: "api" | "demo" | null }) {
  if (source !== "demo") return null;
  return (
    <div className="anim-rise relative mb-4 flex items-start gap-2.5 overflow-hidden rounded-xl border border-accent-line bg-accent-soft/80 px-3.5 py-2.5 text-xs leading-relaxed text-accent shadow-[inset_3px_0_0_var(--color-accent)] backdrop-blur-sm">
      <FlaskConical size={15} className="mt-0.5 shrink-0" />
      <p>
        <Badge variant="purple" className="mr-1.5 align-middle">
          DEMO
        </Badge>
        Dữ liệu hiển thị là bộ minh họa trích từ tài liệu{" "}
        <em className="font-medium not-italic">TongHop_LuongXuLy_HAEIM_Damped.pdf</em> (8 giao
        dịch). Khi kết nối backend, dữ liệu thực tế sẽ thay thế hoàn toàn bộ này.
      </p>
    </div>
  );
}
