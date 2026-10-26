"use client";

import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Controls";
import { useDismissable } from "@/hooks/useFocusTrap";
import { useApp } from "@/lib/context/AppContext";
import { matchNav } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { ChevronRight, LayoutDashboard, Menu, RefreshCw, Settings2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";

/**
 * Header: breadcrumb theo nhóm chức năng, trạng thái backend (bấm để xem URL
 * hiệu lực + kiểm tra lại), cờ cấu hình chưa lưu và phiên thực thi hiện tại.
 * Cố gắng giữ gọn trong một hàng (h-14).
 */
export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const { demoMode, backendStatus, activeSession, configDirty, apiBaseUrl, refreshBackend } =
    useApp();
  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  useDismissable(statusRef, statusOpen, () => setStatusOpen(false));

  const matched = matchNav(pathname);
  const group = matched?.group.label;
  const page = matched?.item.label ?? "Trang";
  const sessionStatus = activeSession?.status;

  const statusTone =
    backendStatus === "connected"
      ? "border-success-line bg-success-soft text-success"
      : backendStatus === "unreachable"
        ? "border-danger-line bg-danger-soft text-danger"
        : backendStatus === "demo"
          ? "border-accent-line bg-accent-soft text-accent"
          : "border-line bg-surface-2 text-ink-3";

  const statusText =
    backendStatus === "connected"
      ? "Backend đã kết nối"
      : backendStatus === "unreachable"
        ? "Backend mất kết nối"
        : backendStatus === "demo"
          ? "Chế độ DEMO"
          : "Đang kiểm tra…";

  return (
    <header className="glass-bar sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/60 px-3 sm:px-5">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-grad-brand opacity-40"
      />
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Mở menu điều hướng"
        className="rounded-md p-2 text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink lg:hidden"
      >
        <Menu size={18} />
      </button>

      {/* Breadcrumb */}
      <nav aria-label="Đường dẫn trang" className="min-w-0 flex-1">
        <ol className="flex min-w-0 items-center gap-1.5 text-xs">
          <li className="hidden shrink-0 sm:flex sm:items-center">
            <Link
              href="/"
              aria-label="Tổng quan"
              className="rounded p-1 text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <LayoutDashboard size={14} />
            </Link>
            <ChevronRight size={12} className="mx-1 shrink-0 text-ink-3/70" aria-hidden />
          </li>
          {group && group !== page && (
            <li className="hidden shrink-0 items-center gap-1.5 text-ink-3 sm:flex">
              <span className="truncate">{group}</span>
              <ChevronRight size={12} className="shrink-0 text-ink-3/70" aria-hidden />
            </li>
          )}
          <li className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-semibold text-ink" aria-current="page">
              {page}
            </span>
            {configDirty && (
              <span
                className="hidden shrink-0 rounded border border-warning-line bg-warning-soft px-1.5 py-0.5 text-[10px] font-medium text-warning sm:inline"
                title="Cấu hình thuật toán chưa được lưu"
              >
                chưa lưu
              </span>
            )}
          </li>
        </ol>
      </nav>

      <div className="flex shrink-0 items-center gap-2">
        {demoMode && <StatusBadge status="demo" />}

        {activeSession && (
          <div className="hidden items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-1 md:flex">
            <span className="text-[11px] text-ink-3">Phiên:</span>
            <span
              className={cn(
                "text-[11px] font-semibold",
                sessionStatus === "running" && "text-warning",
                sessionStatus === "done" && "text-success",
                sessionStatus === "error" && "text-danger",
                sessionStatus === "stopped" && "text-ink-3",
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

        {/* Trạng thái backend + popover chi tiết */}
        <div ref={statusRef} className="relative">
          <button
            type="button"
            onClick={() => setStatusOpen((o) => !o)}
            aria-expanded={statusOpen}
            aria-haspopup="dialog"
            title="Trạng thái kết nối backend"
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors",
              statusTone,
            )}
          >
            <span
              className={cn(
                "size-1.5 shrink-0 rounded-full bg-current",
                backendStatus === "checking" && "animate-pulse",
                (backendStatus === "connected" || backendStatus === "demo") && "pulse-ring",
              )}
            />
            <span className="hidden text-[11px] font-medium sm:inline">
              {backendStatus === "connected"
                ? "Backend OK"
                : backendStatus === "unreachable"
                  ? "Mất kết nối"
                  : backendStatus === "demo"
                    ? "DEMO"
                    : "Kiểm tra…"}
            </span>
            <span className="sr-only sm:hidden">{statusText}</span>
          </button>

          {statusOpen && (
            <div
              role="dialog"
              aria-label="Trạng thái kết nối backend"
              className="anim-pop glass-strong absolute right-0 top-full z-40 mt-2 w-[300px] rounded-xl p-3.5"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-ink">Kết nối backend</p>
                <StatusBadge
                  status={
                    backendStatus === "connected"
                      ? "connected"
                      : backendStatus === "unreachable"
                        ? "unreachable"
                        : backendStatus === "demo"
                          ? "demo"
                          : "checking"
                  }
                />
              </div>
              <dl className="mt-2.5 space-y-1.5 text-[11px]">
                <div>
                  <dt className="text-ink-3">URL hiệu lực</dt>
                  <dd className="mt-0.5 rounded-md bg-surface-2 px-2 py-1.5 font-mono break-all text-ink-2">
                    {apiBaseUrl || "— chưa cấu hình —"}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-3">Nguồn</dt>
                  <dd className="text-ink-2">
                    {demoMode
                      ? "DEMO — dữ liệu minh họa, chưa gọi API"
                      : "Gọi API thật theo cấu hình"}
                  </dd>
                </div>
              </dl>
              <div className="mt-3 flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refreshBackend()}
                  disabled={demoMode}
                >
                  <RefreshCw size={13} /> Kiểm tra lại
                </Button>
                <Link href="/settings" onClick={() => setStatusOpen(false)}>
                  <Button variant="secondary" size="sm">
                    <Settings2 size={13} /> Cài đặt
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
