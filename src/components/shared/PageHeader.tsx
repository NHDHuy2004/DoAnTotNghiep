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
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
          {badges}
        </div>
        {description && (
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-2">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

/** Nhãn nguồn dữ liệu — bắt buộc hiển thị khi đang ở DEMO mode. */
export function DemoBanner({ source }: { source: "api" | "demo" | null }) {
  if (source !== "demo") return null;
  return (
    <div className="mb-4 flex items-start gap-2.5 rounded-card border border-accent-line bg-accent-soft/70 px-3.5 py-2.5 text-xs leading-relaxed text-accent">
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
