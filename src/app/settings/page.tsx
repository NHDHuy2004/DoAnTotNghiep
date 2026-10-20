"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Button, Input } from "@/components/ui/Controls";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { useApp } from "@/lib/context/AppContext";
import { useState } from "react";

/**
 * Cài đặt:
 * - Trạng thái backend + URL hiệu lực (env hoặc bản ghi đè).
 * - Cho phép ghi đè API base URL (lưu localStorage) — áp dụng ngay, không cần reload.
 * - Giải thích chế độ DEMO và cách chuyển sang backend thật.
 */
export default function SettingsPage() {
  const {
    backendStatus,
    refreshBackend,
    demoMode,
    apiBaseUrl,
    apiOverride,
    setApiBaseUrl,
  } = useApp();

  const [url, setUrl] = useState<string>(apiOverride);
  // Đồng bộ ô nhập khi bản ghi đè thay đổi từ nguồn khác (tab khác / vừa lưu).
  const [prevOverride, setPrevOverride] = useState<string>(apiOverride);
  if (apiOverride !== prevOverride) {
    setPrevOverride(apiOverride);
    setUrl(apiOverride);
  }

  const [saved, setSaved] = useState(false);

  const saveUrl = () => {
    setApiBaseUrl(url);
    setSaved(true);
  };

  return (
    <div>
      <PageHeader
        title="Cài đặt"
        description="Cấu hình kết nối backend và xem trạng thái hệ thống."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Kết nối backend"
            description="Backend API của hệ thống HAEIM_Damped."
          />
          <CardBody className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">Trạng thái:</span>
              <StatusBadge
                status={
                  backendStatus === "connected"
                    ? "connected"
                    : backendStatus === "unreachable"
                      ? "unreachable"
                      : "demo"
                }
              />
            </div>
            <div>
              <p className="text-xs text-slate-500">
                URL hiệu lực{" "}
                <span className="text-slate-400">
                  ({apiOverride ? "ghi đè trên trình duyệt" : "NEXT_PUBLIC_API_BASE_URL (env)"})
                </span>
                :
              </p>
              <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
                {apiBaseUrl || "— chưa cấu hình —"}
              </p>
            </div>
            <Input
              label="Ghi đè URL backend (lưu trên trình duyệt)"
              placeholder="http://localhost:8080/api"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setSaved(false);
              }}
              hint="Để trống để quay lại giá trị env. Áp dụng ngay cho toàn bộ trang — không cần tải lại."
              name="apiBaseUrl"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={saveUrl}>Lưu</Button>
              <Button variant="secondary" onClick={refreshBackend}>
                Kiểm tra lại kết nối
              </Button>
              {saved && (
                <span className="text-xs text-emerald-600">Đã lưu — áp dụng ngay.</span>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Chế độ dữ liệu"
            description="Nguồn dữ liệu đang dùng để hiển thị."
          />
          <CardBody className="space-y-2 text-sm text-slate-600">
            {demoMode ? (
              <>
                <p>
                  <strong>DEMO mode đang BẬT.</strong> Hệ thống hiển thị bộ dữ liệu minh họa
                  8 giao dịch trích từ tài liệu
                  <em> TongHop_LuongXuLy_HAEIM_Damped.pdf</em>, gồm cả trace ba pha và kết
                  quả HAEI mẫu.
                </p>
                <p className="text-xs text-slate-500">
                  Để dùng backend thật: nhập URL backend ở cột bên trái (áp dụng ngay), hoặc đặt{" "}
                  <code>NEXT_PUBLIC_API_BASE_URL</code> trong <code>.env.local</code> rồi chạy
                  lại <code>npm run dev</code>. Xem hợp đồng API tại{" "}
                  <code>docs/API_CONTRACT.md</code>.
                </p>
              </>
            ) : (
              <>
                <p>
                  <strong>DEMO mode đang TẮT.</strong> Mọi số liệu được lấy từ backend qua
                  API.
                </p>
                <p className="text-xs text-slate-500">
                  Nếu backend chưa sẵn sàng, các trang sẽ hiển thị trạng thái lỗi kèm nút thử
                  lại — không có dữ liệu giả. Xóa ghi đè URL ở cột bên trái để quay về env.
                </p>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Thông tin hệ thống" />
        <CardBody className="text-sm text-slate-600">
          <ul className="list-inside list-disc space-y-1 text-xs">
            <li>
              Frontend: Next.js (App Router) + TypeScript + Tailwind CSS — giao diện phân tích
              HAEIM_Damped.
            </li>
            <li>
              Tham số thuật toán: hệ số suy giảm <code>f</code>, ngưỡng <code>minae</code>,
              bảng <code>investmentTable</code>.
            </li>
            <li>
              Ba pha: <strong>Construction</strong> (ghi giá trị thô) →{" "}
              <strong>Restructure</strong> (suy giảm + lọc) → <strong>Expansion</strong> (DFS +
              ghép).
            </li>
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
