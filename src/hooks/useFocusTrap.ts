"use client";

/**
 * Focus trap + scroll lock cho Modal / Drawer.
 *
 * - Khi mở: giữ lại phần tử đang focus, chuyển focus vào panel.
 * - Tab / Shift+Tab bị kẹt trong panel (hoặc fallback sang nút đóng).
 * - Escape gọi onClose.
 * - Khi đóng: trả focus về phần tử trước đó, mở lại cuộn trang.
 *
 * `onClose` được đọc qua ref: các component truyền arrow function mới mỗi render,
 * nếu đưa thẳng vào dependency thì trap sẽ cài lại mỗi lần parent render →
 * focus bị giật về nút đóng, lock cuộn bị reset (vd: trang Thực thi render lại
 * mỗi 5 giây khi đang poll trong lúc Drawer log đang mở).
 */
import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function useFocusTrap(
  panelRef: RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void,
): void {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Khóa cuộn trang nền
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusFirst = () => {
      if (!panel) return;
      const target =
        panel.querySelector<HTMLElement>("[data-autofocus]") ??
        panel.querySelector<HTMLElement>(FOCUSABLE) ??
        panel;
      target.focus({ preventScroll: true });
    };
    // defer để panel đã render xong
    const raf = requestAnimationFrame(focusFirst);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      // Focus đã ra ngoài panel (click nền, trình duyệt…) → kéo vào lại.
      const active = document.activeElement;
      if (active && active instanceof HTMLElement && !panel.contains(active)) {
        e.preventDefault();
        focusFirst();
        return;
      }
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [open, panelRef]);
}

/** Đóng popover / dropdown khi bấm ra ngoài hoặc nhấn Escape. */
export function useDismissable(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void,
): void {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) closeRef.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, ref]);
}
