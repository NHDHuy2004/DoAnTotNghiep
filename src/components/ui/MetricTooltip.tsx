"use client";

import { METRICS, type MetricKey } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import { HelpCircle } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

interface Anchor {
  top: number;
  left: number;
  above: boolean;
}

/**
 * Tooltip render qua PORTAL (fixed position) — không bị cắt bởi
 * overflow-x-auto của bảng hay overflow-y của card.
 * Kích hoạt bằng hover lẫn focus (keyboard), đóng bằng Escape/scroll.
 */
function useTipAnchor(open: boolean, side: "top" | "right" | "bottom") {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  const compute = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (side === "right") {
      // Không tràn mép phải: tooltip rộng tới 280px → lùi lại nếu sắp vượt màn hình.
      const left = Math.max(8, Math.min(r.right + 10, window.innerWidth - 300));
      setAnchor({ top: r.top + r.height / 2, left, above: false });
      return;
    }
    const above = side === "top" || r.bottom + 240 > window.innerHeight;
    // Căn giữa theo icon nhưng luôn giữ 140px mỗi bên (tooltip `translateX(-50%)`).
    const half = Math.min(140, window.innerWidth / 2 - 8);
    const left = Math.min(
      Math.max(r.left + r.width / 2, half),
      window.innerWidth - half,
    );
    setAnchor({
      top: above ? r.top - 8 : r.bottom + 8,
      left,
      above,
    });
  }, [side]);

  useLayoutEffect(() => {
    if (open) compute();
  }, [open, compute]);

  useEffect(() => {
    if (!open) return;
    const close = () => setAnchor(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAnchor(null);
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return { ref, anchor, compute };
}

function TipBox({
  anchor,
  side,
  children,
  className,
}: {
  anchor: Anchor;
  side: "top" | "right" | "bottom";
  children: ReactNode;
  className?: string;
}) {
  const style: CSSProperties =
    side === "right"
      ? { top: anchor.top, left: anchor.left, transform: "translateY(-50%)" }
      : anchor.above
        ? { bottom: window.innerHeight - anchor.top, left: anchor.left, transform: "translateX(-50%)" }
        : { top: anchor.top, left: anchor.left, transform: "translateX(-50%)" };

  return createPortal(
    <div
      role="tooltip"
      style={style}
      className={cn(
        "fixed z-[var(--z-tooltip)] w-[min(280px,calc(100vw-2rem))] rounded-lg border border-line bg-surface p-3 text-left text-xs text-ink shadow-pop",
        className,
      )}
    >
      {children}
    </div>,
    document.body,
  );
}

export interface MetricTooltipProps {
  /** Khóa trong bảng chú giải (ưu tiên — nguồn duy nhất của công thức). */
  metricKey?: MetricKey;
  /** Ghi đè mô tả (khi cần thêm ngữ cảnh riêng của bảng). */
  term?: string;
  formula?: string;
  description?: string;
}

/** Icon "?" giải thích một chỉ số toán học / thuật ngữ. */
export function MetricTooltip({
  metricKey,
  term,
  formula,
  description,
}: MetricTooltipProps) {
  const def = metricKey ? METRICS[metricKey] : undefined;
  const label = term ?? def?.term ?? "";
  const f = formula ?? def?.formula;
  const d = description ?? def?.description ?? "";

  const [open, setOpen] = useState(false);
  const { ref, anchor } = useTipAnchor(open, "bottom");

  return (
    <span
      ref={ref}
      className="inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={`Giải thích: ${label}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        className="inline-flex size-4 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-brand-soft hover:text-brand"
      >
        <HelpCircle size={12} />
      </button>
      {open && anchor && (
        <TipBox anchor={anchor} side="bottom">
          <span className="block font-semibold text-ink">{label}</span>
          {f && (
            <code className="mt-1.5 block rounded-md border border-brand-line bg-brand-soft px-2 py-1.5 font-mono text-[11px] break-all text-brand">
              {f}
            </code>
          )}
          <span className="mt-1.5 block leading-relaxed text-ink-2">{d}</span>
        </TipBox>
      )}
    </span>
  );
}

/**
 * Header cột bảng: nhãn + tooltip chỉ số. Dùng thống nhất cho mọi bảng
 * xuất hiện ae, dae, Sdae, SMDAEUB, TDAEUB, STDAEUB, LTDAEUB…
 */
export function ColumnHeader({
  label,
  metricKey,
  tooltip,
  className,
}: {
  label: string;
  metricKey?: MetricKey;
  tooltip?: { formula?: string; description: string };
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap", className)}>
      {label}
      <MetricTooltip
        metricKey={metricKey}
        // label rỗng (dùng riêng icon ?) → lấy term từ METRICS
        term={label || undefined}
        formula={tooltip?.formula}
        description={tooltip?.description}
      />
    </span>
  );
}

/** Tooltip cơ chế hover/focus cho bất kỳ phần tử nào (vd: menu khi sidebar thu gọn). */
export function Tip({
  label,
  side = "right",
  children,
  className,
}: {
  label: string;
  side?: "top" | "right" | "bottom";
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { ref, anchor } = useTipAnchor(open, side);

  return (
    <span
      ref={ref}
      className={cn("inline-flex", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={() => setOpen(false)}
    >
      {children}
      {open && anchor && (
        <TipBox anchor={anchor} side={side} className="w-max max-w-[240px]">
          {label}
        </TipBox>
      )}
    </span>
  );
}
