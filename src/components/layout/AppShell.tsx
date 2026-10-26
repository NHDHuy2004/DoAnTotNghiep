"use client";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { ToastProvider } from "@/components/ui/Toast";
import { AppProvider } from "@/lib/context/AppContext";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Shell toàn ứng dụng: Sidebar (collapsible trên desktop, drawer trên mobile)
 * + Header sticky + vùng nội dung chính. Kèm skip-link cho bàn phím.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Đóng drawer khi nhấn Escape / quay về kích thước desktop
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    const mq = window.matchMedia("(min-width: 1024px)");
    const onMq = () => {
      if (mq.matches) setMobileOpen(false);
    };
    mq.addEventListener("change", onMq);
    return () => {
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileOpen]);

  return (
    <AppProvider>
      <ToastProvider>
        <a
          href="#main-content"
          className="sr-only rounded-lg bg-surface px-4 py-2 text-sm font-medium text-brand shadow-pop focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100]"
        >
          Bỏ qua đến nội dung chính
        </a>

        {/* Sidebar desktop */}
        <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">
          <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        </div>

        {/* Drawer mobile */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="anim-fade absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
            <div className="anim-slide-in-left absolute inset-y-0 left-0">
              <Sidebar
                collapsed={false}
                variant="mobile"
                onNavigate={() => setMobileOpen(false)}
                onToggle={() => setMobileOpen(false)}
              />
            </div>
            <span className="sr-only" role="status">
              Đã mở menu điều hướng
            </span>
          </div>
        )}

        <div
          className={cn(
            "min-h-screen transition-[padding] duration-200",
            collapsed ? "lg:pl-16" : "lg:pl-64",
          )}
        >
          <Header onMenuClick={() => setMobileOpen(true)} />
          <main
            id="main-content"
            className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 sm:py-6"
          >
            {/* key = route → nội dung vào nhẹ sau mỗi lần chuyển trang */}
            <div key={pathname} className="page-enter">
              {children}
            </div>
          </main>
        </div>
      </ToastProvider>
    </AppProvider>
  );
}
