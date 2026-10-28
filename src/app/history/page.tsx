"use client";

import { useAsync } from "@/hooks/useAsync";
import { DemoBanner, PageHeader } from "@/components/shared/PageHeader";
import { Button, Select } from "@/components/ui/Controls";
import { Card, SectionLabel } from "@/components/ui/Card";
import { DataTable, Pagination, type Column } from "@/components/ui/DataTable";
import { Dialog } from "@/components/ui/Dialog";
import { Badge, StatusBadge, type BadgeVariant } from "@/components/ui/Badge";
import { MetricTooltip } from "@/components/ui/MetricTooltip";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/States";
import { InlineAlert } from "@/components/ui/Toast";
import { FilterBar } from "@/components/ui/FilterBar";
import { MetaItem } from "@/components/ui/Meta";
import { listExecutions } from "@/lib/services/executionHistoryService";
import { useApp } from "@/lib/context/AppContext";
import type { ExecutionSession, PhaseKey, PhaseStatus } from "@/lib/types";
import { fmt, fmtDateTime, fmtDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { History as HistoryIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const PHASE_LABEL: Record<PhaseKey, string> = {
  construction: "Xây dựng",
  restructure: "Tái cấu trúc",
  expansion: "Mở rộng",
};

/** Trạng thái pha → biến thể badge (ngữ nghĩa: green = xong, amber = đang chạy…). */
const PHASE_VARIANT: Record<PhaseStatus, BadgeVariant> = {
  pending: "gray",
  running: "amber",
  done: "green",
  error: "red",
  stopped: "gray",
};

function PhaseDot({ status }: { status: PhaseStatus }) {
  const map: Record<PhaseStatus, { cls: string; label: string }> = {
    pending: { cls: "bg-surface-3", label: "chưa chạy" },
    running: { cls: "bg-warning animate-pulse", label: "đang chạy" },
    done: { cls: "bg-success", label: "hoàn thành" },
    error: { cls: "bg-danger", label: "lỗi" },
    stopped: { cls: "bg-ink-3", label: "đã dừng" },
  };
  const c = map[status] ?? { cls: "bg-surface-3", label: String(status) };
  // Chấm phải có kích thước + hình tròn (trước đây chỉ có class màu → co về 0px).
  return (
    <span
      className={cn("inline-block size-2 shrink-0 rounded-full ring-1 ring-black/5", c.cls)}
      title={c.label}
      aria-label={c.label}
      role="img"
    />
  );
}

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
      render: (s) => (
        <div className="min-w-0">
          <div className="truncate font-mono text-xs font-semibold text-ink">{s.id}</div>
          <div className="mt-1 flex items-center gap-1">
            <PhaseDot status={s.phases.construction} />
            <PhaseDot status={s.phases.restructure} />
            <PhaseDot status={s.phases.expansion} />
          </div>
        </div>
      ),
    },
    {
      key: "startedAt",
      header: "Bắt đầu",
      hideOnMobile: true,
      render: (s) => <span className="text-xs text-ink-2">{fmtDateTime(s.startedAt)}</span>,
    },
    {
      key: "finishedAt",
      header: "Kết thúc",
      hideOnMobile: true,
      render: (s) => <span className="text-xs text-ink-3">{fmtDateTime(s.finishedAt)}</span>,
    },
    {
      key: "transactions",
      header: "Giao dịch",
      align: "right",
      render: (s) => s.transactionCount,
    },
    {
      key: "params",
      header: "f / minae",
      align: "right",
      hideOnMobile: true,
      render: (s) => (
        <span className="font-mono text-xs tabular-nums">
          {fmt(s.config.f, 2)} / {fmt(s.config.minae, 3)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (s) => <StatusBadge status={s.status} withDot />,
    },
    {
      key: "haei",
      header: "Số HAEI",
      align: "right",
      render: (s) => s.haeiCount ?? "—",
    },
    {
      key: "duration",
      header: "Thời gian",
      align: "right",
      render: (s) => <span className="text-xs tabular-nums">{fmtDuration(s.executionTimeMs)}</span>,
    },
    {
      key: "actions",
      header: "Thao tác",
      align: "center",
      hideOnMobile: true,
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

  const total = list.data?.total ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lịch sử thực thi"
        description="Danh sách các phiên thực thi đã chạy — mở lại để xem cấu hình, trạng thái 3 pha và kết quả tương ứng."
        actions={
          <Button variant="secondary" onClick={list.reload}>
            Làm mới
          </Button>
        }
      />
      <DemoBanner source={list.source ?? null} />

      {demoMode && (
        <InlineAlert kind="warning" title="Dữ liệu DEMO chỉ giữ trong phiên trình duyệt">
          Lịch sử không được lưu bền vững ở chế độ DEMO. Khi backend hỗ trợ{" "}
          <code>GET /executions</code>, dữ liệu sẽ được lấy từ đó.
        </InlineAlert>
      )}

      <Card>
        <FilterBar
          meta={list.loading ? "Đang tải…" : `${total} phiên`}
          onReset={status !== "all" ? () => { setStatus("all"); setPage(1); } : undefined}
        >
          <Select
            label="Lọc trạng thái"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            className="w-full sm:w-40"
            name="status"
          >
            <option value="all">Tất cả</option>
            <option value="running">Đang chạy</option>
            <option value="done">Hoàn thành</option>
            <option value="error">Thất bại</option>
            <option value="stopped">Đã dừng</option>
          </Select>
        </FilterBar>

        {list.loading ? (
          <TableSkeleton rows={6} cols={7} />
        ) : list.error ? (
          <div className="p-4">
            <ErrorState message={list.error} onRetry={list.reload} />
          </div>
        ) : total === 0 ? (
          <EmptyState
            icon={<HistoryIcon size={22} />}
            title="Chưa có phiên thực thi nào"
            description="Hãy chạy thuật toán ở trang Cấu hình / Thực thi để phiên xuất hiện tại đây."
            action={
              <Link href="/config">
                <Button variant="primary">Đi tới Cấu hình thuật toán</Button>
              </Link>
            }
          />
        ) : (
          <>
            <DataTable
              caption="Lịch sử các phiên thực thi"
              columns={columns}
              rows={list.data!.items}
              rowKey={(s) => s.id}
              onRowClick={(s) => setDetail(s)}
              highlightRow={(s) => s.status === "running"}
              maxHeight="60vh"
            />
            <Pagination
              page={list.data!.page}
              pageSize={list.data!.pageSize}
              total={total}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      <Dialog
        open={detail !== null}
        title={detail ? `Phiên ${detail.id}` : ""}
        description="Thông tin chi tiết và cấu hình của phiên."
        onClose={() => setDetail(null)}
        width="max-w-2xl"
        footer={
          detail && (
            <>
              <Link href="/results">
                <Button variant="secondary">Xem kết quả</Button>
              </Link>
              <Link href="/execution">
                <Button variant="primary">Mở trang thực thi</Button>
              </Link>
            </>
          )
        }
      >
        {detail && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              <MetaItem label="Trạng thái">
                <StatusBadge status={detail.status} withDot />
              </MetaItem>
              <MetaItem label="Số HAEI" mono>
                {detail.haeiCount ?? "—"}
              </MetaItem>
              <MetaItem label="Thời gian xử lý" mono>
                {fmtDuration(detail.executionTimeMs)}
              </MetaItem>
              <MetaItem label="Bắt đầu">{fmtDateTime(detail.startedAt)}</MetaItem>
              <MetaItem label="Kết thúc">{fmtDateTime(detail.finishedAt)}</MetaItem>
              <MetaItem label="Ltid" mono>
                {detail.ltid}
              </MetaItem>
            </dl>

            {detail.error && (
              <InlineAlert kind="error" title="Phiên thất bại">
                {detail.error}
              </InlineAlert>
            )}

            <div className="rounded-lg border border-line bg-surface-2/60 p-4">
              <SectionLabel>Trạng thái 3 pha</SectionLabel>
              <ul className="flex flex-wrap gap-2">
                {(Object.keys(PHASE_LABEL) as PhaseKey[]).map((k) => (
                  <li key={k}>
                    <Badge variant={PHASE_VARIANT[detail.phases[k]] ?? "gray"}>
                      <PhaseDot status={detail.phases[k]} />
                      {PHASE_LABEL[k]}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-line bg-surface-2/60 p-4">
              <SectionLabel>Cấu hình của phiên</SectionLabel>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <MetaItem
                  label={
                    <span className="inline-flex items-center gap-1">
                      f <MetricTooltip metricKey="f" term="Hệ số suy giảm f" />
                    </span>
                  }
                  mono
                >
                  {fmt(detail.config.f, 2)}
                </MetaItem>
                <MetaItem
                  label={
                    <span className="inline-flex items-center gap-1">
                      minae <MetricTooltip metricKey="minae" term="Ngưỡng minae" />
                    </span>
                  }
                  mono
                >
                  {fmt(detail.config.minae, 3)}
                </MetaItem>
                <div className="col-span-2">
                  <dt className="text-[11px] font-medium text-ink-3">investmentTable</dt>
                  <dd className="mt-0.5 font-mono text-xs leading-relaxed break-all text-ink-2">
                    {Object.entries(detail.config.investmentTable)
                      .map(([k, v]) => `${k}:${v}`)
                      .join("  ")}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

