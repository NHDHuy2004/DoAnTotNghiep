"use client";

import { StatusBadge } from "@/components/ui/Badge";
import { useApp } from "@/lib/context/AppContext";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LABELS: Record<string, string> = {
  "": "Tổng quan",
  transactions: "Dữ liệu giao dịch",
  config: "Cấu hình thuật toán",
  execution: "Thực thi thuật toán",
  "dae-list": "DAE-List Explorer",
  results: "Kết quả HAEI",
  history: "Lịch sử thực thi",
  settings: "Cài đặt",
};

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const { demoMode, backendStatus, activeSession, configDirty } = useApp();

  const segments = pathname.split("/").filter(Boolean);
  const crumb = segments.length === 0 ? "Tổng quan" : LABELS[segments[0]] ?? segments[0];

  const sessionStatus = activeSession?.status;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Mở menu điều hướng"
        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:hidden"
      >
        <Menu size={18} />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Link href="/" className="hover:text-slate-600">
            HAEIM_Damped
          </Link>
          <span aria-hidden>/</span>
          <span className="truncate font-medium text-slate-600">{crumb}</span>
          {configDirty && (
            <span className="ml-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
              cấu hình chưa lưu
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {demoMode && <StatusBadge status="demo" />}
        <div
          className={cn(
            "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 sm:flex",
            backendStatus === "connected" && "border-emerald-200 bg-emerald-50",
            backendStatus === "unreachable" && "border-red-200 bg-red-50",
            backendStatus === "demo" && "border-violet-200 bg-violet-50",
            backendStatus === "checking" && "border-slate-200 bg-slate-50",
          )}
          title="Trạng thái kết nối backend"
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              backendStatus === "connected" && "bg-emerald-500",
              backendStatus === "unreachable" && "bg-red-500",
              backendStatus === "demo" && "bg-violet-500",
              backendStatus === "checking" && "animate-pulse bg-slate-400",
            )}
          />
          <span className="text-[11px] font-medium text-slate-600">
            {backendStatus === "connected"
              ? "Backend OK"
              : backendStatus === "unreachable"
                ? "Backend mất kết nối"
                : backendStatus === "demo"
                  ? "Chế độ DEMO"
                  : "Đang kiểm tra…"}
          </span>
        </div>

        {activeSession && (
          <div className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 md:flex">
            <span className="text-[11px] text-slate-500">Phiên:</span>
            <span
              className={cn(
                "text-[11px] font-semibold",
                sessionStatus === "running" && "text-amber-600",
                sessionStatus === "done" && "text-emerald-600",
                sessionStatus === "error" && "text-red-600",
                sessionStatus === "stopped" && "text-slate-500",
              )}
            >
              {sessionStatus === "running"
                ? "đang chạy"
                : sessionStatus === "done"
                  ? "hoàn thành"
                  : sessionStatus === "error"
                    ? "thất bại"
                    : "đã dừng"}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
