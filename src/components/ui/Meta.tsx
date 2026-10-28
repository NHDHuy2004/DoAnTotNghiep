import type { MetricKey } from "@/lib/metrics";
import { MetricTooltip } from "@/components/ui/MetricTooltip";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Ô “nhãn – giá trị” dùng chung (chi tiết giao dịch, node DAE, phiên thực thi…).
 * Thay cho 5 bản chép tay trùng lặp trong các trang.
 *
 * - `variant="plain"`: chỉ chữ (dùng trong khối chi tiết đã có nền chung).
 * - `variant="boxed"`: có viền + nền nhẹ (dùng khi ô đứng độc lập).
 * - `emphasized`: giá trị lớn, màu brand — chỉ số nổi bật của khối.
 * - `metricKey`: kèm icon “?” giải thích công thức (nguồn duy nhất: lib/metrics).
 */
export function MetaItem({
  label,
  value,
  children,
  mono,
  metricKey,
  emphasized = false,
  variant = "plain",
  className,
}: {
  /** Nhãn hiển thị phía trên. */
  label: ReactNode;
  /** Giá trị dạng chuỗi (dùng thay `children` khi không cần node phức tạp). */
  value?: string;
  children?: ReactNode;
  /** Giá trị là số liệu / mã → dựng bằng monospace + tabular. */
  mono?: boolean;
  /** Khóa trong bảng chú giải công thức. */
  metricKey?: MetricKey;
  /** Chỉ số nổi bật: cỡ lớn, màu brand. */
  emphasized?: boolean;
  variant?: "plain" | "boxed";
  className?: string;
}) {
  const content = children ?? value;
  return (
    <div
      className={cn(
        variant === "boxed" && "rounded-lg border border-line bg-surface-2/70 px-3.5 py-2.5",
        className,
      )}
    >
      <dt className="flex items-center gap-1 text-[11px] font-medium text-ink-3">
        {label}
        {metricKey && (
          <MetricTooltip metricKey={metricKey} term={typeof label === "string" ? label : undefined} />
        )}
      </dt>
      <dd
        className={cn(
          "tabular-nums",
          mono && "font-mono",
          emphasized
            ? "mt-1 text-xl font-semibold tracking-[-0.02em] text-brand"
            : "mt-0.5 text-sm font-semibold text-ink",
        )}
      >
        {content}
      </dd>
    </div>
  );
}
