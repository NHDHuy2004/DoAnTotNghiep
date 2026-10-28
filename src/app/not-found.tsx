"use client";

import { ArrowLeft, Home, SearchX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * 404 — trang không tồn tại (thiếu sót thường gặp: người dùng bị bế tắc).
 * Có cả lối “quay lại” (history.back) lẫn lối về Tổng quan.
 */
export default function NotFound() {
  const router = useRouter();

  return (
    <div className="anim-rise mx-auto flex w-full max-w-3xl flex-col items-center rounded-2xl border border-line bg-surface px-6 py-14 text-center shadow-card">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-grad-brand text-white shadow-[0_14px_28px_-16px_rgba(42,92,201,0.95)]">
        <SearchX size={24} />
      </span>

      <p className="mt-5 font-mono text-sm font-semibold text-brand">404</p>
      <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] text-ink sm:text-3xl">
        Không tìm thấy trang
      </h1>
      <p className="mt-2 max-w-[58ch] text-sm leading-relaxed text-ink-2">
        Đường dẫn này không tồn tại hoặc đã bị đổi. Bạn có thể quay lại trang trước, hoặc bắt đầu
        lại từ Tổng quan.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-grad-brand px-4 text-sm font-semibold text-white shadow-[0_8px_18px_-10px_rgba(42,92,201,0.95)] transition-all duration-200 hover:brightness-[1.06] active:scale-[0.985] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <Home size={15} /> Về Tổng quan
        </Link>
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-line-2 bg-white px-4 text-sm font-semibold text-ink-2 transition-all duration-200 hover:border-brand-line hover:text-ink active:scale-[0.985] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <ArrowLeft size={15} /> Quay lại
        </button>
      </div>

      <p className="mt-6 text-xs text-ink-3">
        Cần kiểm tra kết nối backend?{" "}
        <Link href="/settings" className="font-semibold text-brand underline-offset-2 hover:underline">
          Mở trang Cài đặt
        </Link>
        .
      </p>
    </div>
  );
}
