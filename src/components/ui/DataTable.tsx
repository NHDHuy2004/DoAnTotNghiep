"use client";

import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ChevronsRight, Inbox } from "lucide-react";
import { type ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: ReactNode;
  /**
   * Icon giải thích (MetricTooltip) render NGOÀI nút sắp xếp.
   * Cột vừa sắp xếp được thì `header` phải là nhãn thuần (string) — nếu đặt
   * <button> bên trong nút sắp xếp sẽ sinh HTML lồng nhau (lỗi hydration) và
   * bấm "?" cũng sẽ sort cột.
   */
  tooltip?: ReactNode;
  /** true → cột có thể sắp xếp (gọi onSortChange). */
  sortable?: boolean;
  align?: "left" | "right" | "center";
  className?: string;
  /** Ẩn cột trên mobile nếu không quan trọng. */
  hideOnMobile?: boolean;
  render: (row: T) => ReactNode;
}

/**
 * Bảng dữ liệu dùng chung:
 * - header sticky khi giới hạn chiều cao (dễ quét khi bảng dài),
 * - sắp xếp bằng nút (aria-sort), hàng bấm được bằng bàn phím (Enter/Space),
 * - scroll ngang có chủ đích cho màn hình hẹp, empty state có gợi ý.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  sort,
  onSortChange,
  emptyMessage = "Không có dữ liệu",
  emptyAction,
  dense = false,
  highlightRow,
  maxHeight,
  minWidth = 640,
  caption,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  sort?: { key: string; order: "asc" | "desc" };
  onSortChange?: (key: string) => void;
  emptyMessage?: ReactNode;
  emptyAction?: ReactNode;
  dense?: boolean;
  highlightRow?: (row: T) => boolean;
  /** Ví dụ "60vh": bảng cuộn trong khung, header dính phía trên. */
  maxHeight?: string;
  minWidth?: number;
  caption?: string;
}) {
  const hideSm = (col: Column<T>) => (col.hideOnMobile ? "hidden md:table-cell" : undefined);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-4 py-14 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-surface-3 text-ink-3">
          <Inbox size={20} />
        </span>
        <p className="text-sm font-medium text-ink-2">{emptyMessage}</p>
        {emptyAction && <div className="mt-1">{emptyAction}</div>}
      </div>
    );
  }

  return (
    <div
      className={cn("w-full overflow-auto", maxHeight && "overscroll-contain")}
      style={maxHeight ? { maxHeight } : undefined}
    >
      <table className="w-full border-collapse text-sm" style={{ minWidth }}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-line bg-brand-soft">
            {columns.map((col) => {
              const active = sort?.key === col.key;
              const ariaSort = active ? (sort?.order === "asc" ? "ascending" : "descending") : undefined;
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={ariaSort}
                  className={cn(
                    "px-3 py-2.5 text-[11px] font-semibold tracking-wide text-ink-3 uppercase",
                    maxHeight && "sticky top-0 z-10 bg-brand-soft",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    hideSm(col),
                    col.className,
                  )}
                >
                  {col.sortable && onSortChange ? (
                    <span className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onSortChange(col.key)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded transition-colors hover:text-ink",
                          active && "text-brand",
                        )}
                      >
                        {col.header}
                        <SortIcon active={active} order={sort?.order} />
                      </button>
                      {col.tooltip}
                    </span>
                  ) : col.tooltip ? (
                    <span className="inline-flex items-center gap-1">
                      {col.header}
                      {col.tooltip}
                    </span>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const clickable = !!onRowClick;
            return (
              <tr
                key={rowKey(row)}
                tabIndex={clickable ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
                className={cn(
                  "border-b border-line last:border-b-0 transition-colors",
                  clickable &&
                    "cursor-pointer hover:bg-brand-soft/50 focus-visible:bg-brand-soft/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                  highlightRow?.(row) && "bg-warning-soft/60",
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-3 align-middle text-ink-2",
                      dense ? "py-1.5" : "py-2.5",
                      col.align === "right" && "text-right tabular-nums",
                      col.align === "center" && "text-center",
                      hideSm(col),
                      col.className,
                    )}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SortIcon({ active, order }: { active?: boolean; order?: "asc" | "desc" }) {
  if (!active) return <span aria-hidden className="text-[10px] text-ink-3">↕</span>;
  return (
    <span aria-hidden className={cn("text-[10px]", order === "asc" ? "" : "rotate-180")}>
      ▲
    </span>
  );
}

/** Phân trang: số trang + tới/lui, hiển thị tổng bản ghi. */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pages = buildPages(page, totalPages);
  if (total === 0) return null;

  const btn =
    "flex h-8 min-w-8 items-center justify-center rounded-md border border-line-2 bg-surface px-2 text-xs text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs text-ink-3",
        className,
      )}
    >
      <span className="tabular-nums">
        Trang {page}/{totalPages} · {total} bản ghi
      </span>
      <nav className="flex items-center gap-1" aria-label="Phân trang">
        <button
          type="button"
          className={btn}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Trang trước"
        >
          <ChevronLeft size={14} />
        </button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="px-1 text-ink-3">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              aria-current={p === page ? "page" : undefined}
              onClick={() => onPageChange(p)}
              className={cn(
                btn,
                p === page &&
                  "border-brand bg-brand text-white hover:bg-brand-2 hover:text-white",
              )}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          className={btn}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Trang sau"
        >
          <ChevronRight size={14} />
        </button>
        <button
          type="button"
          className={cn(btn, "hidden sm:flex")}
          disabled={page >= totalPages}
          onClick={() => onPageChange(totalPages)}
          aria-label="Trang cuối"
        >
          <ChevronsRight size={14} />
        </button>
      </nav>
    </div>
  );
}

/** Chuỗi trang: 1 … 4 5 6 … 20 */
function buildPages(page: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(total - 1, page + 1);
  if (start > 2) out.push("…");
  for (let p = start; p <= end; p++) out.push(p);
  if (end < total - 1) out.push("…");
  out.push(total);
  return out;
}
