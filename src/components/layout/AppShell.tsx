"use client";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { AppProvider } from "@/lib/context/AppContext";
import { cn } from "@/lib/utils";
import { useState, type ReactNode } from "react";

/** Shell: Sidebar (collapsible) + Header + vùng nội dung chính. */
export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <AppProvider>
      {/* Sidebar desktop */}
      <div className="hidden lg:block">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      </div>

      {/* Drawer mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0">
            <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div
        className={cn(
          "min-h-screen transition-all duration-200",
          collapsed ? "lg:pl-16" : "lg:pl-64",
        )}
      >
        <Header onMenuClick={() => setMobileOpen(true)} />
        <main className="mx-auto max-w-[1400px] p-4 lg:p-6">{children}</main>
      </div>
    </AppProvider>
  );
}
