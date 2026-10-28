"use client";

import { Tip } from "@/components/ui/MetricTooltip";
import { NAV_GROUPS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { FlaskConical, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Sidebar: điều hướng theo nhóm chức năng, active có thanh chỉ báo + màu chủ đạo,
 * thu gọn còn icon (kèm tooltip), drawer cho màn hình nhỏ.
 */
export function Sidebar({
  collapsed,
  onToggle,
  onNavigate,
  variant = "desktop",
}: {
  collapsed: boolean;
  onToggle?: () => void;
  /** Đóng drawer mobile sau khi điều hướng. */
  onNavigate?: () => void;
  variant?: "desktop" | "mobile";
}) {
  const pathname = usePathname();
  const isCollapsed = collapsed && variant === "desktop";

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-white/70 bg-white/72 shadow-[inset_-1px_0_0_rgba(255,255,255,0.6),12px_0_32px_-28px_rgba(15,23,41,0.9)] backdrop-blur-xl transition-[width] duration-300",
        isCollapsed ? "w-16" : "w-64",
      )}
      aria-label="Điều hướng chính"
    >
      {/* Thương hiệu — cùng chiều cao với Header để thẳng hàng */}
      <div className={cn("flex h-14 shrink-0 items-center gap-2.5 border-b border-white/70", isCollapsed ? "justify-center px-2" : "px-4")}>
        <span className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-grad-brand text-white shadow-[0_6px_16px_-6px_rgba(42,92,201,0.85)]">
          <FlaskConical size={18} />
        </span>
        {!isCollapsed && (
          <div className="min-w-0">
            <p className="truncate bg-grad-brand bg-clip-text text-sm leading-tight font-bold text-transparent">
              HAEIM_Damped
            </p>
            <p className="truncate text-[10px] leading-tight text-ink-3">
              Khai thác tập mục · suy giảm
            </p>
          </div>
        )}
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-1.5 last:mb-0">
            {!isCollapsed && (
              <p className="px-3 pt-3 pb-1.5 text-[11px] font-semibold tracking-[0.01em] text-ink-3">
                {group.label}
              </p>
            )}
            <ul className="flex flex-col gap-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active =
                  href === "/"
                    ? pathname === "/"
                    : pathname === href || pathname.startsWith(`${href}/`);

                const link = (
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    onClick={onNavigate}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl py-2 text-sm font-medium transition-all duration-200",
                      "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                      isCollapsed ? "h-9 justify-center px-0" : "px-3",
                      active
                        ? "bg-grad-brand-soft text-brand shadow-[inset_0_0_0_1px_rgba(42,92,201,0.14)]"
                        : "text-ink-2 hover:translate-x-0.5 hover:bg-white/70 hover:text-ink",
                    )}
                  >
                    {active && (
                      <span
                        aria-hidden
                        className="absolute -left-2 top-1/2 h-6 w-1.5 -translate-y-1/2 rounded-r-full bg-grad-brand shadow-[0_0_10px_rgba(42,92,201,0.65)]"
                      />
                    )}
                    <Icon
                      size={17}
                      className={cn(
                        "shrink-0 transition-transform duration-200",
                        active ? "scale-110" : "group-hover:scale-105",
                      )}
                    />
                    {!isCollapsed && <span className="truncate">{label}</span>}
                  </Link>
                );

                return (
                  <li key={href}>
                    {isCollapsed ? (
                      <Tip label={label} side="right" className="block">
                        {link}
                      </Tip>
                    ) : (
                      link
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Chân sidebar */}
      <div className="shrink-0 border-t border-white/70 p-2">
        {variant === "desktop" && onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={isCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg py-2 text-xs font-medium text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink",
              "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
              isCollapsed ? "justify-center px-0" : "px-3",
            )}
          >
            {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            {!isCollapsed && <span>Thu gọn menu</span>}
          </button>
        )}
        {variant === "mobile" && (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Đóng menu điều hướng"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
          >
            <PanelLeftClose size={16} />
            <span>Đóng menu</span>
          </button>
        )}
        {!isCollapsed && (
          <p className="px-3 pt-1 pb-1 text-[10px] text-ink-3">
            Frontend v0.1.0 · Next.js App Router
          </p>
        )}
      </div>
    </aside>
  );
}
