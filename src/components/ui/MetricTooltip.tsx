"use client";

import { HelpCircle } from "lucide-react";
import { useState } from "react";

/**
 * Tooltip giải thích công thức/trường toán học.
 * Hover hoặc focus (keyboard) để xem — accessible theo WAI-ARIA.
 */
export function MetricTooltip({
  term,
  formula,
  description,
}: {
  term: string;
  formula?: string;
  description: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={`Giải thích ${term}`}
        aria-expanded={open}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex size-4 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <HelpCircle size={12} />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-1/2 top-full z-40 mt-1 w-64 -translate-x-1/2 rounded-lg border border-slate-200 bg-slate-900 p-2.5 text-left text-xs text-slate-100 shadow-lg"
        >
          <span className="block font-semibold">{term}</span>
          {formula && (
            <code className="mt-1 block rounded bg-slate-800 px-1.5 py-1 font-mono text-[11px] text-blue-200">
              {formula}
            </code>
          )}
          <span className="mt-1 block leading-relaxed text-slate-300">{description}</span>
        </span>
      )}
    </span>
  );
}

/** Header cột bảng kèm tooltip — dùng cho các cột DAE-List / kết quả. */
export function ColumnHeader({
  label,
  tooltip,
}: {
  label: string;
  tooltip?: { formula?: string; description: string };
}) {
  if (!tooltip) return <span>{label}</span>;
  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <MetricTooltip term={label} formula={tooltip.formula} description={tooltip.description} />
    </span>
  );
}
