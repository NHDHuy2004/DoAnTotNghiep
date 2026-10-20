"use client";

import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md";

const variantMap: Record<Variant, string> = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500 disabled:bg-blue-300",
  secondary:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-400 disabled:text-slate-400",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 disabled:bg-red-300",
  ghost:
    "text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-400 disabled:text-slate-300",
};

const sizeMap: Record<Size, string> = {
  sm: "h-8 px-2.5 text-xs",
  md: "h-9 px-3.5 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed",
        variantMap[variant],
        sizeMap[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({
  label,
  error,
  hint,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: ReactNode;
}) {
  const id = props.id ?? props.name;
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-slate-600">
          {label}
        </label>
      )}
      <input
        className={cn(
          "h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800",
          "placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100",
          error && "border-red-400 focus:border-red-500 focus:ring-red-100",
          className,
        )}
        aria-invalid={!!error}
        {...props}
      />
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
      {error && <p className="text-[11px] font-medium text-red-600">{error}</p>}
    </div>
  );
}

export function Select({
  label,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  const id = props.id ?? props.name;
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-slate-600">
          {label}
        </label>
      )}
      <select
        className={cn(
          "h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-800",
          "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
