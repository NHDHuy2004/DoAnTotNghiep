/**
 * Cấu trúc điều hướng — NGUỒN DUY NHẤT cho Sidebar và Breadcrumb (Header).
 * Chỉ liệt kê route thực sự tồn tại trong `src/app` — không tạo menu giả.
 */
import {
  Activity,
  Database,
  History,
  ListTree,
  LayoutDashboard,
  Settings,
  SlidersHorizontal,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  /** Nhóm hiển thị trong Sidebar + cấp đầu breadcrumb. */
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Tổng quan",
    items: [{ href: "/", label: "Tổng quan", icon: LayoutDashboard }],
  },
  {
    label: "Dữ liệu",
    items: [{ href: "/transactions", label: "Dữ liệu giao dịch", icon: Database }],
  },
  {
    label: "Thuật toán",
    items: [
      { href: "/config", label: "Cấu hình thuật toán", icon: SlidersHorizontal },
      { href: "/execution", label: "Thực thi thuật toán", icon: Activity },
      { href: "/dae-list", label: "DAE-List Explorer", icon: ListTree },
      { href: "/results", label: "Kết quả HAEI", icon: Trophy },
    ],
  },
  {
    label: "Hệ thống",
    items: [
      { href: "/history", label: "Lịch sử thực thi", icon: History },
      { href: "/settings", label: "Cài đặt", icon: Settings },
    ],
  },
];

/** Tìm item + nhóm theo pathname hiện tại (dùng cho active và breadcrumb). */
export function matchNav(pathname: string): { group: NavGroup; item: NavItem } | null {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      const active =
        item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
      if (active) return { group, item };
    }
  }
  return null;
}
