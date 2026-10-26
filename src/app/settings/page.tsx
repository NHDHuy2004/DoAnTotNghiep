"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Button, Input } from "@/components/ui/Controls";
import { Card, CardBody, CardHeader, SectionLabel } from "@/components/ui/Card";
import { Dot, StatusBadge } from "@/components/ui/Badge";
import { InlineAlert, useToast } from "@/components/ui/Toast";
import { useApp } from "@/lib/context/AppContext";
import { MetricTooltip } from "@/components/ui/MetricTooltip";
import { FlaskConical, Plug, RotateCcw, Save } from "lucide-react";
import { useState } from "react";

/**
 * Cài đặt:
 * - Trạng thái backend + URL hiệu lực (env hoặc bản ghi đè).
 * - Cho phép ghi đè API base URL (lưu localStorage) — áp dụng ngay, không cần reload.
 * - Giải thích chế độ DEMO và cách chuyển sang backend thật.
 */
export default function SettingsPage() {
  const toast = useToast();
  const {
    backendStatus,
    refreshBackend,
    demoMode,
    apiBaseUrl,
    apiOverride,
    setApiBaseUrl,
  } = useApp();

  const [url, setUrl] = useState<string>(apiOverride);
  const [urlError, setUrlError] = useState<string | null>(null);
  // Đồng bộ ô nhập khi bản ghi đè thay đổi từ nguồn khác (tab khác / vừa lưu).
  const [prevOverride, setPrevOverride] = useState<string>(apiOverride);
  if (apiOverride !== prevOverride) {
    setPrevOverride(apiOverride);
    setUrl(apiOverride);
  }

  /** URL rỗng = quay về env; nếu có giá trị thì phải là http(s):// hợp lệ. */
  const validateUrl = (v: string): string | null => {
    const trimmed = v.trim();
    if (!trimmed) return null;
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return "URL phải bắt đầu bằng http:// hoặc https://";
      }
      return null;
    } catch {
      return "URL không hợp lệ. Ví dụ: http://localhost:8080/api";
    }
  };

  const saveUrl = () => {
    const err = validateUrl(url);
    setUrlError(err);
    if (err) {
      toast.error("Chưa lưu được URL backend", err);
      return;
    }
    setApiBaseUrl(url.trim());
    toast.success("Đã lưu cấu hình", url.trim() ? "Áp dụng ngay cho toàn bộ trang." : "Đã quay về giá trị env.");
  };

  const resetUrl = () => {
    setUrl("");
    setUrlError(null);
    setApiBaseUrl("");
    toast.info("Đã xóa ghi đè", "Quay lại NEXT_PUBLIC_API_BASE_URL trong .env.local.");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cài đặt"
        description="Cấu hình kết nối backend và xem trạng thái hệ thống."
        actions={
          <Button variant="secondary" onClick={refreshBackend}>
            <Plug size={15} /> Kiểm tra lại kết nối
          </Button>
        }
      />

      {/* Thẻ trạng thái tổng quan */}
      <Card>
        <CardBody className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
              <Plug size={17} />
            </span>
            <div>
              <p className="text-[11px] font-medium text-ink-3">Trạng thái backend</p>
              <div className="mt-0.5">
                <StatusBadge
                  status={
                    backendStatus === "connected"
                      ? "connected"
                      : backendStatus === "unreachable"
                        ? "unreachable"
                        : backendStatus === "checking"
                          ? "checking"
                          : "demo"
                  }
                  withDot
                />
              </div>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-ink-3">
              URL hiệu lực{" "}
              <span className="text-ink-3/80">
                ({apiOverride ? "ghi đè trên trình duyệt" : "NEXT_PUBLIC_API_BASE_URL (env)"})
              </span>
            </p>
            <p className="mt-1 truncate rounded-lg bg-surface-2 px-3 py-2 font-mono text-xs text-ink-2">
              {apiBaseUrl || "— chưa cấu hình —"}
            </p>
          </div>
        </CardBody>
      </Card>

      <div className="stagger grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Ghi đè URL backend"
            description="Lưu trên trình duyệt, áp dụng ngay — không cần tải lại trang."
          />
          <CardBody className="space-y-3">
            <Input
              label="URL backend"
              placeholder="http://localhost:8080/api"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (urlError) setUrlError(null);
              }}
              error={urlError ?? undefined}
              hint="Để trống để quay lại giá trị env."
              name="apiBaseUrl"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" onClick={saveUrl} disabled={url === apiOverride}>
                <Save size={15} /> Lưu
              </Button>
              <Button
                variant="secondary"
                onClick={resetUrl}
                disabled={!apiOverride && url === ""}
              >
                <RotateCcw size={15} /> Quay về env
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Chế độ dữ liệu"
            description="Nguồn dữ liệu đang dùng để hiển thị."
            icon={demoMode ? <FlaskConical size={15} /> : undefined}
          />
          <CardBody className="space-y-3 text-sm text-ink-2">
            {demoMode ? (
              <>
                <InlineAlert kind="warning" title="DEMO mode đang BẬT">
                  Hệ thống hiển thị bộ dữ liệu minh họa 8 giao dịch trích từ tài liệu{" "}
                  <em className="not-italic">TongHop_LuongXuLy_HAEIM_Damped.pdf</em>, gồm cả
                  trace ba pha và kết quả HAEI mẫu.
                </InlineAlert>
                <p className="text-xs leading-relaxed text-ink-3">
                  Để dùng backend thật: nhập URL backend ở cột bên trái (áp dụng ngay), hoặc đặt{" "}
                  <code>NEXT_PUBLIC_API_BASE_URL</code> trong <code>.env.local</code> rồi chạy lại{" "}
                  <code>npm run dev</code>. Xem hợp đồng API tại <code>docs/API_CONTRACT.md</code>.
                </p>
              </>
            ) : (
              <>
                <p className="flex items-center gap-2">
                  <Dot className="bg-success" />
                  <strong>DEMO mode đang TẮT.</strong> Mọi số liệu được lấy từ backend qua API.
                </p>
                <p className="text-xs leading-relaxed text-ink-3">
                  Nếu backend chưa sẵn sàng, các trang sẽ hiển thị trạng thái lỗi kèm nút thử lại —
                  không có dữ liệu giả. Bấm “Quay về env” ở cột bên trái để xóa ghi đè URL.
                </p>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Thông tin hệ thống" />
        <CardBody>
          <ul className="list-inside list-disc space-y-1.5 text-xs leading-relaxed text-ink-2 marker:text-ink-3">
            <li>
              Frontend: Next.js (App Router) + TypeScript + Tailwind CSS — giao diện phân tích
              HAEIM_Damped.
            </li>
            <li>
              Tham số thuật toán: hệ số suy giảm{" "}
              <span className="inline-flex items-center gap-1">
                <code>f</code> <MetricTooltip metricKey="f" term="Hệ số suy giảm f" />
              </span>
              , ngưỡng{" "}
              <span className="inline-flex items-center gap-1">
                <code>minae</code> <MetricTooltip metricKey="minae" term="Ngưỡng minae" />
              </span>
              , bảng <code>investmentTable</code>.
            </li>
            <li>
              Ba pha: <strong>Xây dựng (Construction)</strong> → <strong>Tái cấu trúc
              (Restructure)</strong> → <strong>Mở rộng (Expansion)</strong>.
            </li>
          </ul>
        </CardBody>
      </Card>

      <SectionLabel>Chú giải nhanh</SectionLabel>
      <Card>
        <CardBody className="grid gap-3 text-xs leading-relaxed text-ink-2 sm:grid-cols-3">
          <p>
            <strong className="text-ink">DEMO mode:</strong> dữ liệu minh họa tĩnh, dùng để demo
            giao diện khi backend chưa chạy.
          </p>
          <p>
            <strong className="text-ink">Backend mode:</strong> mọi số liệu gọi từ API theo{" "}
            <code>docs/API_CONTRACT.md</code>.
          </p>
          <p>
            <strong className="text-ink">Ghi đè URL:</strong> lưu trên localStorage của trình duyệt
            hiện tại, không ảnh hưởng máy khác.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
