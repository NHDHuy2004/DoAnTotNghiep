"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: ReactNode;
  /** true → cột có thể sắp xếp (gọi onSort). */
  sortable?: boolean;
  align?: "left" | "right" | "center";
  className?: string;
  render: (row: T) => ReactNode;
}

/**
 * Bảng dữ liệu dùng chung: header có nút sắp xếp, hỗ trợ row click,
 * scroll ngang cho màn hình hẹp. Phân trang nằm ngoài (Pagination).
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  sort,
  onSortChange,
  emptyMessage = "Không có dữ liệu",
  dense = false,
  highlightRow,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  sort?: { key: string; order: "asc" | "desc" };
  onSortChange?: (key: string) => void;
  emptyMessage?: string;
  dense?: boolean;
  highlightRow?: (row: T) => boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-slate-400">{emptyMessage}</div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/70">
            {columns.map((col) => {
              const active = sort?.key === col.key;
              return (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    "px-3 py-2.5 text-xs font-semibold text-slate-500",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    col.className,
                  )}
                >
                  {col.sortable && onSortChange ? (
                    <button
                      type="button"
                      onClick={() => onSortChange(col.key)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                        active && "text-blue-700",
                      )}
                    >
                      {col.header}
                      <span aria-hidden className="text-[10px]">
                        {active ? (sort?.order === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "border-b border-slate-100 last:border-b-0",
                onRowClick &&
                  "cursor-pointer transition-colors hover:bg-blue-50/50 focus-within:bg-blue-50/50",
                highlightRow?.(row) && "bg-amber-50/40",
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "px-3 text-slate-700",
                    dense ? "py-1.5" : "py-2.5",
                    col.align === "right" && "text-right tabular-nums",
                    col.align === "center" && "text-center",
                    col.className,
                  )}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  return (
    <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
      <span>
        Trang {page}/{totalPages} · {total} bản ghi
      </span>
      <div className="flex gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-md border border-slate-200 px-2.5 py-1 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Trước
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-md border border-slate-200 px-2.5 py-1 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Sau
        </button>
      </div>
    </div>
  );
}
