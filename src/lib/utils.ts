import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Định dạng số thực: 4 chữ số thập phân, bỏ zeros thừa. */
export function fmt(n: number | undefined | null, digits = 4): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return n.toFixed(digits).replace(/\.?0+$/, "") || "0";
}

/** Định dạng {a,b,c}. */
export function fmtItemset(items: string[]): string {
  return `{${items.join(",")}}`;
}

export function fmtDateTime(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function fmtDuration(ms: number | undefined): string {
  if (ms === undefined || ms === null) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}
