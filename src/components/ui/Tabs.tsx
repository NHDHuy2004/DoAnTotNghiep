"use client";

import { cn } from "@/lib/utils";
import { useRef, type ReactNode } from "react";

export interface TabItem {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
}

/**
 * Tabs theo WAI-ARIA: chọn bằng click, di chuyển bằng phím mũi tên / Home / End.
 * Dùng cho các view ngang hàng (3 pha thực thi, cấp cửa sổ / cấp giao dịch).
 */
export function Tabs({
  items,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  items: TabItem[];
  value: string;
  onChange: (key: string) => void;
  ariaLabel: string;
  className?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  const move = (dir: 1 | -1 | "first" | "last") => {
    let next: TabItem | undefined;
    if (dir === "first") next = items[0];
    else if (dir === "last") next = items[items.length - 1];
    else {
      const idx = items.findIndex((i) => i.key === value);
      const start = idx + dir;
      next = items.slice(start >= 0 ? start : items.length + start)[0] ?? items[dir === 1 ? 0 : items.length - 1];
    }
    if (!next || next.key === value) return;
    onChange(next.key);
    requestAnimationFrame(() => {
      listRef.current
        ?.querySelector<HTMLButtonElement>(`[data-tab="${next!.key}"]`)
        ?.focus({ preventScroll: true });
    });
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex gap-1 overflow-x-auto border-b border-line px-1 no-scrollbar",
        className,
      )}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          move(1);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          move(-1);
        } else if (e.key === "Home") {
          e.preventDefault();
          move("first");
        } else if (e.key === "End") {
          e.preventDefault();
          move("last");
        }
      }}
    >
      {items.map((t) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            type="button"
            data-tab={t.key}
            role="tab"
            id={`tab-${t.key}`}
            aria-selected={active}
            aria-controls={active ? `tabpanel-${t.key}` : undefined}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.key)}
            className={cn(
              "relative inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200",
              "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
              active
                ? "bg-grad-brand-soft font-semibold text-brand shadow-[inset_0_0_0_1px_rgba(37,99,235,0.18)]"
                : "text-ink-2 hover:bg-white/70 hover:text-ink",
            )}
          >
            {t.icon}
            {t.label}
            {t.badge}
            {active && (
              <span
                aria-hidden
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-grad-brand"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({
  tabKey,
  active,
  children,
  className,
}: {
  tabKey: string;
  active: boolean;
  children: ReactNode;
  className?: string;
}) {
  if (!active) return null;
  return (
    <div
      role="tabpanel"
      id={`tabpanel-${tabKey}`}
      aria-labelledby={`tab-${tabKey}`}
      tabIndex={0}
      className={cn(
        "anim-fade focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        className,
      )}
    >
      {children}
    </div>
  );
}
