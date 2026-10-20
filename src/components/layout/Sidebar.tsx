"use client";

import { cn } from "@/lib/utils";
import {
  Activity,
  BarChart3,
  Database,
  FlaskConical,
  History,
  ListTree,
  Settings,
  SlidersHorizontal,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Tổng quan", icon: BarChart3 },
  { href: "/transactions", label: "Dữ liệu giao dịch", icon: Database },
  { href: "/config", label: "Cấu hình thuật toán", icon: SlidersHorizontal },
  { href: "/execution", label: "Thực thi thuật toán", icon: Activity },
  { href: "/dae-list", label: "DAE-List Explorer", icon: ListTree },
  { href: "/results", label: "Kết quả HAEI", icon: Trophy },
  { href: "/history", label: "Lịch sử thực thi", icon: History },
  { href: "/settings", label: "Cài đặt", icon: Settings },
] as const;

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 bg-white transition-all duration-200",
        collapsed ? "w-16" : "w-64",
      )}
      aria-label="Điều hướng chính"
    >
      <div className="flex h-14 items-center gap-2 border-b border-slate-100 px-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
          <FlaskConical size={18} />
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-800">HAEIM_Damped</p>
            <p className="truncate text-[10px] text-slate-400">Mining khai thác tập mục</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? label : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                    active
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                  )}
                >
                  <Icon size={18} className="shrink-0" />
                  {!collapsed && <span className="truncate">{label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-slate-100 p-2">
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
          className="flex w-full items-center justify-center rounded-lg py-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {collapsed ? "»" : "« Thu gọn"}
        </button>
      </div>
    </aside>
  );
}
