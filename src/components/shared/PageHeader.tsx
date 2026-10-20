"use client";

import { Badge } from "@/components/ui/Badge";
import { FlaskConical } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-lg font-bold text-slate-900">{title}</h1>
        {description && <p className="mt-0.5 max-w-3xl text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Nhãn nguồn dữ liệu — bắt buộc hiển thị khi đang ở DEMO mode. */
export function DemoBanner({ source }: { source: "api" | "demo" | null }) {
  if (source !== "demo") return null;
  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg border border-violet-200 bg-violet-50/70 px-3 py-2 text-xs text-violet-700">
      <FlaskConical size={14} className="mt-0.5 shrink-0" />
      <p>
        <Badge variant="purple" className="mr-1">
          DEMO
        </Badge>
        Dữ liệu đang hiển thị là bộ minh họa trích từ tài liệu
        <em> TongHop_LuongXuLy_HAEIM_Damped.pdf</em> (8 giao dịch). Khi backend
        được kết nối, kết quả thực tế sẽ thay thế hoàn toàn dữ liệu này.
      </p>
    </div>
  );
}
