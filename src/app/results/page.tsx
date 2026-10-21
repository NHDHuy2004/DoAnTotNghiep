"use client";

import { useAsync } from "@/hooks/useAsync";
import { DemoBanner, PageHeader } from "@/components/shared/PageHeader";
import { Button, SearchField, Select } from "@/components/ui/Controls";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataTable, Pagination, type Column } from "@/components/ui/DataTable";
import { Dialog } from "@/components/ui/Dialog";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { ColumnHeader, MetricTooltip } from "@/components/ui/MetricTooltip";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/States";
import { FilterBar } from "@/components/ui/FilterBar";
import { InlineAlert, useToast } from "@/components/ui/Toast";
import { exportResultsCsv, listResults } from "@/lib/services/resultService";
import { getDaeNode } from "@/lib/services/daeListService";
import type { HaeiResult } from "@/lib/types";
import { fmt, fmtItemset } from "@/lib/utils";
import { Download, Layers, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function ResultsPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [size, setSize] = useState<number | "all">("all");
  const [status, setStatus] = useState<"haei" | "not" | "all">("all");
  const [sort, setSort] = useState<{ key: string; order: "asc" | "desc" }>({
    key: "sdae",
    order: "desc",
  });
  const [detail, setDetail] = useState<HaeiResult | null>(null);
  const [exporting, setExporting] = useState(false);
  const pageSize = 25;

  const list = useAsync(
    (signal) =>
      listResults(
        {
          search,
          size,
          status,
          sort: sort.key as "itemset" | "sdae" | "size",
          order: sort.order,
          page,
          pageSize,
        },
        signal,
      ),
    [search, size, status, sort, page],
  );

  const handleExport = async () => {
    setExporting(true);
    try {
      const { filename, content } = await exportResultsCsv();
      const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Đã tải file CSV", filename);
    } catch (e) {
      toast.error("Xuất CSV thất bại", e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(false);
    }
  };

  type Row = HaeiResult & { stt: number };

  const columns: Column<Row>[] = useMemo(
    () => [
      { key: "stt", header: "STT", align: "center", hideOnMobile: true, render: (r) => r.stt },
      {
        key: "itemset",
        header: (
          <ColumnHeader
            label="Itemset"
            tooltip={{ description: "Tập mục được thuật toán khai thác." }}
          />
        ),
        sortable: true,
        render: (r) => (
          <span className="font-mono font-semibold text-ink">{fmtItemset(r.itemset)}</span>
        ),
      },
      {
        key: "size",
        header: "Số mục",
        sortable: true,
        align: "right",
        hideOnMobile: true,
        render: (r) => r.size,
      },
      {
        key: "sdae",
        header: <ColumnHeader label="Sdae" metricKey="sdae" />,
        sortable: true,
        align: "right",
        render: (r) => <span className="font-semibold tabular-nums text-brand">{fmt(r.sdae)}</span>,
      },
      {
        key: "minae",
        header: <ColumnHeader label="minae" metricKey="minae" />,
        align: "right",
        hideOnMobile: true,
        render: (r) => <span className="tabular-nums text-ink-3">{fmt(r.minae, 3)}</span>,
      },
      {
        key: "status",
        header: "Trạng thái",
        render: (r) => <StatusBadge status={r.isHaei ? "haei" : "not-haei"} withDot />,
      },
      {
        key: "expandable",
        header: (
          <ColumnHeader
            label="Mở rộng"
            tooltip={{
              description:
                "Khác với HAEI: tập mục đạt HAEI khi Sdae ≥ minae; nhưng chỉ tiếp tục mở rộng khi STDAEUB ≥ minae (còn triển vọng).",
            }}
          />
        ),
        render: (r) =>
          r.expandable ? (
            <Badge variant="blue">Còn mở rộng</Badge>
          ) : (
            <Badge variant="gray">Dừng mở rộng</Badge>
          ),
      },
      {
        key: "actions",
        header: "Thao tác",
        align: "center",
        hideOnMobile: true,
        render: (r) => (
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setDetail(r);
            }}
          >
            Chi tiết
          </Button>
        ),
      },
    ],
    [],
  );

  const rowsWithStt: Row[] = (list.data?.items ?? []).map((r, i) => ({
    ...r,
    stt: (page - 1) * pageSize + i + 1,
  }));

  const total = list.data?.total ?? 0;
  const haeiCount = useMemo(
    () => rowsWithStt.filter((r) => r.isHaei).filter((r) => r.expandable).length,
    [rowsWithStt],
  );
  const bestSdae = useMemo(
    () => rowsWithStt.reduce<number | undefined>((m, r) => (m === undefined || r.sdae > m ? r.sdae : m), undefined),
    [rowsWithStt],
  );

  const hasFilters = search !== "" || size !== "all" || status !== "all";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kết quả HAEI"
        description="Tập mục có hiệu suất trung bình cao theo mô hình suy giảm. Đủ điều kiện HAEI khi Sdae ≥ minae; khả năng mở rộng phụ thuộc STDAEUB — hai khái niệm độc lập."
        badges={list.source === "demo" ? <StatusBadge status="demo" /> : undefined}
        actions={
          <Button variant="secondary" onClick={handleExport} disabled={exporting}>
            <Download size={15} />
            {exporting ? "Đang xuất…" : "Xuất CSV"}
          </Button>
        }
      />
      <DemoBanner source={list.source ?? null} />

      {total > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Tổng kết quả"
            value={total.toLocaleString("vi-VN")}
            hint="Số tập mục trên trang hiện tại"
            icon={<Layers size={15} />}
          />
          <StatCard
            label="Vừa đạt HAEI vừa còn mở rộng"
            value={haeiCount.toLocaleString("vi-VN")}
            hint="Sdae ≥ minae và còn triển vọng mở rộng"
            accent="green"
          />
          <StatCard
            label="Sdae cao nhất"
            value={bestSdae !== undefined ? fmt(bestSdae) : "—"}
            hint="Hiệu suất trung bình suy giảm lớn nhất trang này"
          />
        </div>
      )}

      <Card>
        <FilterBar
          meta={list.loading ? "Đang tải…" : `${total} kết quả`}
          onReset={
            hasFilters
              ? () => {
                  setSearch("");
                  setSearchInput("");
                  setSize("all");
                  setStatus("all");
                  setPage(1);
                }
              : undefined
          }
        >
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setSearch(searchInput);
            }}
          >
            <SearchField
              label="Tìm theo itemset"
              placeholder="VD: bc"
              value={searchInput}
              onChange={setSearchInput}
              onSubmit={() => {
                setPage(1);
                setSearch(searchInput);
              }}
              className="w-48"
            />
            <Button type="submit" variant="secondary" size="md" aria-label="Tìm">
              <Search size={14} /> Tìm
            </Button>
          </form>
          <Select
            label="Độ dài"
            value={String(size)}
            onChange={(e) => {
              setPage(1);
              setSize(e.target.value === "all" ? "all" : Number(e.target.value));
            }}
            className="w-28"
            name="size"
          >
            <option value="all">Tất cả</option>
            <option value="1">1 mục</option>
            <option value="2">2 mục</option>
            <option value="3">3 mục</option>
          </Select>
          <Select
            label="Trạng thái"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value as typeof status);
            }}
            className="w-36"
            name="status"
          >
            <option value="all">Tất cả</option>
            <option value="haei">Chỉ HAEI</option>
            <option value="not">Không đạt</option>
          </Select>
          <Select
            label="Sắp xếp theo"
            value={sort.key}
            onChange={(e) => setSort((s) => ({ ...s, key: e.target.value }))}
            className="w-40"
            name="sort"
          >
            <option value="sdae">Sdae</option>
            <option value="itemset">Tập mục</option>
            <option value="size">Số mục</option>
          </Select>
          <Select
            label="Thứ tự"
            value={sort.order}
            onChange={(e) => setSort((s) => ({ ...s, order: e.target.value as "asc" | "desc" }))}
            className="w-28"
            name="order"
          >
            <option value="desc">Giảm dần</option>
            <option value="asc">Tăng dần</option>
          </Select>
        </FilterBar>

        {list.loading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : list.error ? (
          <div className="p-4">
            <ErrorState message={list.error} onRetry={list.reload} />
          </div>
        ) : total === 0 ? (
          <EmptyState
            title={hasFilters ? "Không có kết quả phù hợp" : "Chưa có kết quả HAEI"}
            description={
              hasFilters
                ? "Thử đổi bộ lọc hoặc từ khóa để xem thêm dữ liệu."
                : list.source === "demo"
                  ? "Dữ liệu demo luôn có kết quả mẫu — nếu thấy trống, hãy kiểm tra bộ lọc."
                  : "Hãy chạy thuật toán tại trang Thực thi để tạo kết quả."
            }
            action={
              hasFilters ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch("");
                    setSearchInput("");
                    setSize("all");
                    setStatus("all");
                    setPage(1);
                  }}
                >
                  Xóa bộ lọc
                </Button>
              ) : (
                <Link href="/execution">
                  <Button variant="primary">Đi tới Thực thi thuật toán</Button>
                </Link>
              )
            }
          />
        ) : (
          <>
            <DataTable
              caption="Bảng kết quả HAEI"
              columns={columns}
              rows={rowsWithStt}
              rowKey={(r) => r.itemset.join(",")}
              onRowClick={(r) => setDetail(r)}
              sort={sort}
              onSortChange={(key) =>
                setSort((s) => ({
                  key,
                  order: s.key === key && s.order === "asc" ? "desc" : "asc",
                }))
              }
              highlightRow={(r) => r.isHaei && r.expandable}
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

      <ResultDetailDialog result={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

function ResultDetailDialog({ result, onClose }: { result: HaeiResult | null; onClose: () => void }) {
  const dae = useAsync((signal) => getDaeNode(result!.itemset, signal), [result?.itemset.join(",")], {
    immediate: result !== null,
  });

  return (
    <Dialog
      open={result !== null}
      title={result ? `Chi tiết ${fmtItemset(result.itemset)}` : ""}
      onClose={onClose}
      width="max-w-3xl"
    >
      {result && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-base font-bold text-ink">{fmtItemset(result.itemset)}</span>
            <StatusBadge status={result.isHaei ? "haei" : "not-haei"} withDot />
            {result.expandable ? (
              <Badge variant="blue">Còn khả năng mở rộng</Badge>
            ) : (
              <Badge variant="gray">Không mở rộng</Badge>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCell label="Sdae" value={fmt(result.sdae)} metricKey="sdae" emphasized />
            <MetricCell label="minae" value={fmt(result.minae, 3)} metricKey="minae" />
            <MetricCell label="Số mục" value={String(result.size)} />
            <MetricCell label="Giao dịch chứa" value={String(result.entryCount)} />
          </dl>

          {result.note && (
            <InlineAlert kind="info" title="Kết luận từ thuật toán/backend">
              {result.note}
            </InlineAlert>
          )}

          <Card>
            <CardHeader
              title="Entry DAE-List (nếu có)"
              description="Danh sách giao dịch chứa tập mục này."
            />
            <CardBody>
              {dae.loading && <p className="text-xs text-ink-3">Đang tải DAE-List…</p>}
              {dae.error && (
                <p className="text-xs text-danger">
                  Không tải được DAE-List cho tập mục này: {dae.error}
                </p>
              )}
              {dae.data && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-ink-3">
                      <th className="py-1.5">tid</th>
                      <th className="py-1.5 text-right">u</th>
                      <th className="py-1.5 text-right">ae/dae</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dae.data.entries.map((e) => (
                      <tr key={e.tid} className="border-b border-line last:border-b-0">
                        <td className="py-1.5 font-mono">T{e.tid}</td>
                        <td className="py-1.5 text-right tabular-nums">{e.u}</td>
                        <td className="py-1.5 text-right font-mono tabular-nums">{fmt(e.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>

          <p className="text-[11px] leading-relaxed text-ink-3">
            Điều kiện HAEI: <code>Sdae ≥ minae</code>. Điều kiện mở rộng:{" "}
            <code>STDAEUB ≥ minae</code> — một tập mục có thể đạt HAEI nhưng không còn khả năng mở
            rộng (vd: {fmtItemset(["c"])} với STDAEUB = 0 trong ví dụ tài liệu).
          </p>
        </div>
      )}
    </Dialog>
  );
}

function MetricCell({
  label,
  value,
  metricKey,
  emphasized,
}: {
  label: string;
  value: string;
  metricKey?: "sdae" | "minae";
  emphasized?: boolean;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface-2/60 px-3.5 py-3">
      <dt className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-3">
        {label}
        {metricKey && <MetricTooltip metricKey={metricKey} term={label} />}
      </dt>
      <dd
        className={`mt-1 font-semibold tabular-nums text-ink ${emphasized ? "text-xl text-brand" : "text-base"}`}
      >
        {value}
      </dd>
    </div>
  );
}
