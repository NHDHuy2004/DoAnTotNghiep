"use client";

import { useAsync } from "@/hooks/useAsync";
import { DemoBanner, PageHeader } from "@/components/shared/PageHeader";
import { Button, Select } from "@/components/ui/Controls";
import { Card } from "@/components/ui/Card";
import { DataTable, Pagination, type Column } from "@/components/ui/DataTable";
import { Dialog } from "@/components/ui/Dialog";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { listExecutions } from "@/lib/services/executionHistoryService";
import { useApp } from "@/lib/context/AppContext";
import type { ExecutionSession } from "@/lib/types";
import { fmt, fmtDateTime, fmtDuration } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";

export default function HistoryPage() {
  const { demoMode } = useApp();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("all");
  const [detail, setDetail] = useState<ExecutionSession | null>(null);
  const pageSize = 10;

  const list = useAsync(
    (signal) => listExecutions({ page, pageSize, status }, signal),
    [page, status],
  );

  const columns: Column<ExecutionSession>[] = [
    {
      key: "id",
      header: "Mã phiên",
      render: (s) => <span className="font-mono text-xs text-slate-700">{s.id}</span>,
    },
    {
      key: "startedAt",
      header: "Bắt đầu",
      render: (s) => <span className="text-xs">{fmtDateTime(s.startedAt)}</span>,
    },
    {
      key: "finishedAt",
      header: "Kết thúc",
      render: (s) => <span className="text-xs">{fmtDateTime(s.finishedAt)}</span>,
    },
    {
      key: "transactions",
      header: "Số giao dịch",
      align: "right",
      render: (s) => s.transactionCount,
    },
    {
      key: "params",
      header: "f / minae",
      align: "right",
      render: (s) => (
        <span className="font-mono text-xs">
          {fmt(s.config.f, 2)} / {fmt(s.config.minae, 3)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (s) => <StatusBadge status={s.status} />,
    },
    {
      key: "haei",
      header: "Số HAEI",
      align: "right",
      render: (s) => s.haeiCount ?? "—",
    },
    {
      key: "duration",
      header: "Thời gian xử lý",
      align: "right",
      render: (s) => <span className="text-xs">{fmtDuration(s.executionTimeMs)}</span>,
    },
    {
      key: "actions",
      header: "Thao tác",
      align: "center",
      render: (s) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            setDetail(s);
          }}
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Lịch sử thực thi"
        description="Danh sách các phiên thực thi đã chạy — mở lại để xem cấu hình, kết quả và log tương ứng."
      />
      <DemoBanner source={list.source ?? null} />

      {demoMode && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-700">
          Ở chế độ DEMO, lịch sử chỉ được giữ trong phiên làm việc hiện tại của trình duyệt
          (không lưu bền vững). Khi backend hỗ trợ <code>GET /executions</code>, dữ liệu sẽ
          được lấy từ đó.
        </p>
      )}

      <Card>
        <div className="flex flex-wrap items-end gap-2 border-b border-slate-100 p-3">
          <Select
            label="Lọc trạng thái"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            className="w-40"
            name="status"
          >
            <option value="all">Tất cả</option>
            <option value="running">Đang chạy</option>
            <option value="done">Hoàn thành</option>
            <option value="error">Thất bại</option>
            <option value="stopped">Đã dừng</option>
          </Select>
          <Button variant="secondary" onClick={list.reload}>
            Làm mới
          </Button>
        </div>

        {list.loading && <LoadingState />}
        {list.error && <ErrorState message={list.error} onRetry={list.reload} />}
        {!list.loading &&
          !list.error &&
          (list.data?.total ?? 0) === 0 && (
            <EmptyState
              title="Chưa có phiên thực thi nào"
              description="Hãy chạy thuật toán ở trang Cấu hình / Thực thi để phiên xuất hiện tại đây."
              action={
                <Link href="/config">
                  <Button variant="secondary">Đi tới Cấu hình thuật toán</Button>
                </Link>
              }
            />
          )}
        {!list.loading && !list.error && (list.data?.total ?? 0) > 0 && (
          <>
            <DataTable
              columns={columns}
              rows={list.data!.items}
              rowKey={(s) => s.id}
              onRowClick={(s) => setDetail(s)}
            />
            <Pagination
              page={list.data!.page}
              pageSize={list.data!.pageSize}
              total={list.data!.total}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      <Dialog
        open={detail !== null}
        title={detail ? `Phiên ${detail.id}` : ""}
        onClose={() => setDetail(null)}
      >
        {detail && (
          <div className="space-y-3">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <dt className="text-[11px] text-slate-400">Trạng thái</dt>
                <dd>
                  <StatusBadge status={detail.status} />
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-400">Số HAEI</dt>
                <dd className="font-mono">{detail.haeiCount ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-400">Bắt đầu</dt>
                <dd>{fmtDateTime(detail.startedAt)}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-400">Kết thúc</dt>
                <dd>{fmtDateTime(detail.finishedAt)}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-400">Ltid</dt>
                <dd className="font-mono">{detail.ltid}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-400">Thời gian xử lý</dt>
                <dd>{fmtDuration(detail.executionTimeMs)}</dd>
              </div>
            </dl>

            <div className="rounded-lg border border-slate-100 p-3">
              <p className="mb-1.5 text-xs font-semibold text-slate-500">
                Cấu hình của phiên
              </p>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                <div>
                  <dt className="text-[11px] text-slate-400">f</dt>
                  <dd className="font-mono">{fmt(detail.config.f, 2)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-slate-400">minae</dt>
                  <dd className="font-mono">{fmt(detail.config.minae, 3)}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-[11px] text-slate-400">investmentTable</dt>
                  <dd className="font-mono text-xs">
                    {Object.entries(detail.config.investmentTable)
                      .map(([k, v]) => `${k}:${v}`)
                      .join("  ")}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="flex justify-end gap-2">
              <Link href="/results">
                <Button variant="secondary" size="sm">
                  Xem kết quả
                </Button>
              </Link>
              <Link href="/execution">
                <Button size="sm">Mở trang thực thi</Button>
              </Link>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
