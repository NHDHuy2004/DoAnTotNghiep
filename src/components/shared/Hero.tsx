"use client";

import { cn } from "@/lib/utils";
import { ArrowRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Hero (chỉ trang Tổng quan): khối gradient tối + lưới kỹ thuật + quầng sáng trôi,
 * tiêu đề nổi bật, pipeline 3 pha và CTA. Toàn bộ là trang trí — số liệu thật
 * vẫn do component khác render (không hiển thị số bịa trong hero).
 */
export function Hero({
  eyebrow,
  title,
  highlight,
  description,
  badges,
  actions,
  steps,
}: {
  /** Nhãn nhỏ phía trên tiêu đề. */
  eyebrow?: string;
  title: string;
  /** Từ được tô gradient trong tiêu đề (vd: "HAEI"). */
  highlight?: string;
  description?: ReactNode;
  badges?: ReactNode;
  actions?: ReactNode;
  /** Các bước pipeline — Construction → Restructure → Expansion. */
  steps?: { label: string; hint?: string; icon?: LucideIcon; state?: "done" | "active" | "idle" }[];
}) {
  const parts = highlight && title.includes(highlight) ? title.split(highlight) : null;

  return (
    <section className="grain anim-rise relative overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(135deg,#0d1c3d_0%,#14305f_42%,#1b4183_78%,#1f4496_100%)] text-white shadow-[0_24px_50px_-32px_rgba(13,28,61,0.9)]">
      {/* Trang trí: lưới kỹ thuật + ba quầng sáng cùng sắc xanh */}
      <span
        aria-hidden
        className="grid-pattern pointer-events-none absolute inset-0 opacity-[0.35] [mask-image:radial-gradient(75%_75%_at_30%_35%,#000_25%,transparent_100%)]"
      />
      <span aria-hidden className="orb -top-24 -left-10 size-72 bg-[#3a6ee0]/45" />
      <span aria-hidden className="orb -right-16 top-10 size-64 bg-[#2a5cc9]/50" style={{ animationDelay: "-6s" }} />
      <span aria-hidden className="orb bottom-[-7rem] left-1/3 size-56 bg-[#1f4496]/70" style={{ animationDelay: "-10s" }} />

      <div className="relative z-10 px-5 py-7 sm:px-7 sm:py-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            {eyebrow && (
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-blue-50 backdrop-blur-sm">
                <span className="size-1.5 rounded-full bg-emerald-400 pulse-ring" aria-hidden />
                {eyebrow}
              </p>
            )}

            <h1 className="text-[26px] leading-[1.15] font-extrabold tracking-[-0.03em] sm:text-[34px]">
              {parts ? (
                <>
                  {parts[0]}
                  <span className="bg-gradient-to-r from-white via-[#cfe0ff] to-[#8fb4ff] bg-clip-text text-transparent">
                    {highlight}
                  </span>
                  {parts[1]}
                </>
              ) : (
                title
              )}
            </h1>

            {description && (
              <p className="mt-3 max-w-[64ch] text-sm leading-relaxed text-blue-100/85">
                {description}
              </p>
            )}

            {badges && <div className="mt-3 flex flex-wrap items-center gap-2">{badges}</div>}

            {actions && (
              <div className="mt-5 flex flex-wrap items-center gap-2.5">{actions}</div>
            )}
          </div>

          {/* Pipeline 3 pha — kính, nối bằng đường sáng */}
          {steps && steps.length > 0 && (
            <ol className="flex w-full shrink-0 flex-col gap-2.5 lg:w-[340px]">
              {steps.map((s, i) => {
                const Icon = s.icon;
                const tone =
                  s.state === "done"
                    ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
                    : s.state === "active"
                      ? "border-sky-300/50 bg-sky-400/20 text-sky-100"
                      : "border-white/15 bg-white/10 text-blue-100/80";
                return (
                  <li
                    key={s.label}
                    className={cn(
                      "anim-rise flex items-center gap-3 rounded-xl border px-3 py-2.5 text-white/90 backdrop-blur-md transition-transform duration-200 hover:-translate-y-0.5",
                      tone,
                    )}
                    style={{ animationDelay: `${0.12 + i * 0.09}s` }}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                      {Icon ? <Icon size={16} /> : <span className="text-xs font-bold">{i + 1}</span>}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold">{s.label}</span>
                      {s.hint && (
                        <span className="block truncate text-[11px] text-white/60">{s.hint}</span>
                      )}
                    </span>
                    <span className="text-[10px] font-semibold tracking-wide opacity-70">
                      {s.state === "done" ? "xong" : s.state === "active" ? "đang chạy" : "chờ"}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}

/** Nút CTA trên nền hero: trắng nổi / viền kính. */
export function HeroAction({
  href,
  children,
  variant = "solid",
}: {
  href: string;
  children: ReactNode;
  variant?: "solid" | "glass";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all duration-200",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
        variant === "solid"
          ? "bg-white text-[#12266b] shadow-[0_10px_24px_-14px_rgba(0,0,0,0.9)] hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-14px_rgba(0,0,0,0.9)]"
          : "border border-white/25 bg-white/10 text-white backdrop-blur-sm hover:-translate-y-0.5 hover:bg-white/20",
      )}
    >
      {children}
      <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
