"use client";

import { cn } from "@/lib/utils";
import { Loader2, Search, X } from "lucide-react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "link";
type Size = "sm" | "md" | "lg";

const variantMap: Record<Variant, string> = {
  primary:
    "sheen bg-grad-brand text-white shadow-[0_8px_18px_-10px_rgba(37,99,235,0.95)] " +
    "hover:shadow-[0_12px_24px_-10px_rgba(37,99,235,0.95)] hover:brightness-[1.06] active:brightness-95 " +
    "disabled:bg-brand-line disabled:text-white/80 disabled:shadow-none disabled:hover:brightness-100",
  secondary:
    "border border-line-2 bg-white/80 text-ink-2 backdrop-blur-sm hover:border-brand-line hover:bg-white hover:text-ink hover:shadow-[0_8px_18px_-14px_rgba(15,23,41,0.7)] " +
    "disabled:text-ink-3 disabled:hover:bg-white/80 disabled:hover:border-line-2",
  ghost:
    "text-ink-2 hover:bg-surface-3 hover:text-ink disabled:text-ink-3",
  danger:
    "sheen bg-grad-danger text-white shadow-[0_8px_18px_-10px_rgba(185,28,28,0.9)] hover:brightness-[1.06] active:brightness-95 disabled:bg-red-300 disabled:shadow-none",
  link: "text-brand hover:text-brand-2 underline-offset-2 hover:underline disabled:text-ink-3",
};

const sizeMap: Record<Size, string> = {
  sm: "h-8 gap-1.5 px-2.5 text-xs rounded-lg",
  md: "h-9 gap-2 px-3.5 text-sm rounded-xl",
  lg: "h-11 gap-2 px-5 text-sm rounded-xl",
};

/**
 * Nút dùng chung. Đã có trạng thái disabled + loading (giữ nguyên kích thước,
 * có aria-busy cho trình đọc màn hình).
 */
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium whitespace-nowrap transition-all duration-200",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        "disabled:cursor-not-allowed",
        variantMap[variant],
        sizeMap[size],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  );
}

const fieldBase =
  "w-full rounded-lg border bg-surface text-sm text-ink placeholder:text-ink-3 " +
  "transition-colors focus:outline-none focus:ring-2 focus:ring-brand/15 focus:border-brand " +
  "disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-3";

const fieldState = (error?: string) =>
  error ? "border-danger focus:border-danger focus:ring-danger/15" : "border-line-2";

export function Input({
  label,
  error,
  hint,
  required,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: ReactNode;
}) {
  const id = props.id ?? props.name;
  const hintId = hint && id ? `${id}-hint` : undefined;
  const errId = error && id ? `${id}-error` : undefined;
  return (
    <div className="flex min-w-0 flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-ink-2">
          {label}
          {required && <span className="ml-1 text-danger" aria-hidden>*</span>}
          {required && <span className="sr-only"> (bắt buộc)</span>}
        </label>
      )}
      <input
        className={cn(fieldBase, "h-9 px-3", fieldState(error), className)}
        aria-invalid={!!error}
        aria-describedby={errId ?? hintId}
        required={required}
        {...props}
      />
      {hint && !error && (
        <p id={hintId} className="text-[11px] leading-relaxed text-ink-3">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} className="text-[11px] font-medium text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Textarea({
  label,
  error,
  hint,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  hint?: ReactNode;
}) {
  const id = props.id ?? props.name;
  return (
    <div className="flex min-w-0 flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-ink-2">
          {label}
        </label>
      )}
      <textarea
        className={cn(
          fieldBase,
          "min-h-24 resize-y px-3 py-2 font-mono text-xs leading-relaxed",
          fieldState(error),
          className,
        )}
        aria-invalid={!!error}
        {...props}
      />
      {hint && !error && <p className="text-[11px] text-ink-3">{hint}</p>}
      {error && (
        <p className="text-[11px] font-medium text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Select({
  label,
  error,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string }) {
  const id = props.id ?? props.name;
  return (
    <div className="flex min-w-0 flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-ink-2">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          className={cn(
            fieldBase,
            "h-9 appearance-none py-1 pr-8 pl-2.5",
            fieldState(error),
            className,
          )}
          aria-invalid={!!error}
          {...props}
        >
          {children}
        </select>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          fill="none"
          className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-ink-3"
        >
          <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {error && (
        <p className="text-[11px] font-medium text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Thanh tìm kiếm: ô nhập có icon, nút xóa và Enter để tìm.
 * `value` do phía gọi kiểm soát (gõ xong bấm Tìm / submit form).
 */
export function SearchField({
  label,
  placeholder,
  value,
  onChange,
  onSubmit,
  className,
  name = "search",
}: {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  className?: string;
  name?: string;
}) {
  return (
    <form
      role="search"
      className={cn("flex min-w-0 items-end gap-2", className)}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
    >
      <div className="flex min-w-0 flex-col gap-1">
        {label && (
          <label htmlFor={name} className="text-xs font-medium text-ink-2">
            {label}
          </label>
        )}
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            id={name}
            name={name}
            type="search"
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              fieldBase,
              "h-9 py-1 pr-8 pl-8 [&::-webkit-search-cancel-button]:hidden",
            )}
          />
          {value && (
            <button
              type="button"
              aria-label="Xóa từ khóa"
              onClick={() => onChange("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-ink-3 hover:bg-surface-3 hover:text-ink"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>
      <Button type="submit" variant="secondary" className="shrink-0">
        Tìm
      </Button>
    </form>
  );
}
