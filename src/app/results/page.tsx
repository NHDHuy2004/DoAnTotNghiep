"use client";

import { useAsync } from "@/hooks/useAsync";
import { DemoBanner, PageHeader } from "@/components/shared/PageHeader";
import { Button, Input, Select } from "@/components/ui/Controls";
import { Card } from "@/components/ui/Card";
import { DataTable, Pagination, type Column } from "@/components/ui/DataTable";
import { Dialog } from "@/components/ui/Dialog";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { ColumnHeader } from "@/components/ui/MetricTooltip";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { exportResultsCsv, listResults } from "@/lib/services/resultService";
import { getDaeNode } from "@/lib/services/daeListService";
import type { HaeiResult } from "@/lib/types";
import { fmt, fmtItemset } from "@/lib/utils";
import { Download, Search, Trophy } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function ResultsPage() {
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
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const pageSize = 10;

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
    setExportMsg(null);
    try {
      const { filename, content } = await exportResultsCsv();
      const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setExportMsg(`Đã tải ${filename}.`);
    } catch (e) {
      setExportMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(false);
    }
  };

  type Row = HaeiResult & { stt: number };

  const columns: Column<Row>[] = useMemo(
    () => [
      { key: "stt", header: "STT", align: "center", render: (r) => r.stt },
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
          <span className="font-mono font-semibold text-slate-800">{fmtItemset(r.itemset)}</span>
        ),
      },
      {
        key: "size",
        header: "Số mục",
        sortable: true,
        align: "right",
        render: (r) => r.size,
      },
      {
        key: "sdae",
        header: (
          <ColumnHeader
            label="Sdae"
            tooltip={{
              formula: "Sdae = Σ ae·f^(Ltid−tid)",
              description: "Hiệu suất trung bình suy giảm của tập mục trên toàn luồng.",
            }}
          />
        ),
        sortable: true,
        align: "right",
        render: (r) => <span className="font-mono text-blue-700">{fmt(r.sdae)}</span>,
      },
      {
        key: "minae",
        header: (
          <ColumnHeader
            label="minae"
            tooltip={{ description: "Ngưỡng hiệu suất trung bình tối thiểu." }}
          />
        ),
        align: "right",
        render: (r) => <span className="font-mono text-slate-500">{fmt(r.minae, 3)}</span>,
      },
      {
        key: "status",
        header: "Trạng thái",
        render: (r) => <StatusBadge status={r.isHaei ? "haei" : "not-haei"} />,
      },
      {
        key: "expandable",
        header: (
          <ColumnHeader
            label="Khả năng mở rộng"
            tooltip={{
              description:
                "Khác với HAEI: một tập mục đạt HAEI khi Sdae ≥ minae; nhưng chỉ tiếp tục mở rộng khi STDAEUB ≥ minae (còn triển vọng).",
            }}
          />
        ),
        render: (r) =>
          r.expandable ? (
            <Badge variant="blue">Còn mở rộng</Badge>
          ) : (
            <Badge variant="gray">Không mở rộng</Badge>
          ),
      },
      {
        key: "actions",
        header: "Thao tác",
        align: "center",
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

  // Cột STT: đánh số theo thứ tự hiển thị
  const rowsWithStt: Row[] = (list.data?.items ?? []).map((r, i) => ({
    ...r,
    stt: (page - 1) * pageSize + i + 1,
  }));

  const isEmpty = !list.loading && !list.error && (list.data?.total ?? 0) === 0;

  return (
    <div>
      <PageHeader
        title="Kết quả HAEI"
        description="Tập mục có hiệu suất trung bình cao theo mô hình suy giảm. Đủ điều kiện HAEI khi Sdae ≥ minae; khả năng mở rộng phụ thuộc STDAEUB — hai khái niệm độc lập."
        actions={
          <Button variant="secondary" onClick={handleExport} disabled={exporting}>
            <Download size={15} />
            {exporting ? "Đang xuất…" : "Xuất CSV"}
          </Button>
        }
      />
      <DemoBanner source={list.source ?? null} />
      {exportMsg && (
        <p className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {exportMsg}
        </p>
      )}

      <Card>
        <div className="flex flex-wrap items-end gap-2 border-b border-slate-100 p-3">
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setSearch(searchInput);
            }}
          >
            <Input
              label="Tìm theo itemset"
              placeholder="VD: bc"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-48"
              name="search"
            />
            <Button type="submit" variant="secondary" size="md">
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
            className="w-32"
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
        </div>

        {list.loading && <LoadingState />}
        {list.error && <ErrorState message={list.error} onRetry={list.reload} />}

        {isEmpty && (
          <EmptyState
            title="Chưa có kết quả HAEI"
            description={
              list.source === "demo"
                ? "Dữ liệu demo luôn có kết quả mẫu — nếu thấy trống, hãy kiểm tra bộ lọc."
                : "Hãy chạy thuật toán tại trang Thực thi để tạo kết quả."
            }
            action={
              <Link href="/execution">
                <Button variant="secondary">Đi tới Thực thi thuật toán</Button>
              </Link>
            }
          />
        )}

        {!list.loading && !list.error && (list.data?.total ?? 0) > 0 && (
          <>
            <DataTable
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

      <ResultDetailDialog result={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

function ResultDetailDialog({
  result,
  onClose,
}: {
  result: HaeiResult | null;
  onClose: () => void;
}) {
  const dae = useAsync(
    (signal) => getDaeNode(result!.itemset, signal),
    [result?.itemset.join(",")],
    { immediate: result !== null },
  );

  return (
    <Dialog
      open={result !== null}
      title={result ? `Chi tiết ${fmtItemset(result.itemset)}` : ""}
      onClose={onClose}
      width="max-w-3xl"
    >
      {result && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Trophy size={16} className="text-amber-500" />
            <span className="font-mono text-base font-bold">{fmtItemset(result.itemset)}</span>
            <StatusBadge status={result.isHaei ? "haei" : "not-haei"} />
            {result.expandable ? (
              <Badge variant="blue">Còn khả năng mở rộng</Badge>
            ) : (
              <Badge variant="gray">Không mở rộng</Badge>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-[11px] text-slate-400">Sdae</dt>
              <dd className="font-mono text-lg font-bold text-blue-700">{fmt(result.sdae)}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-slate-400">minae</dt>
              <dd className="font-mono text-lg">{fmt(result.minae, 3)}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-slate-400">Số mục</dt>
              <dd className="font-mono text-lg">{result.size}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-slate-400">Số giao dịch chứa</dt>
              <dd className="font-mono text-lg">{result.entryCount}</dd>
            </div>
          </dl>

          {result.note && (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <MetricTooltipInline /> {result.note}
            </p>
          )}

          <div className="rounded-lg border border-slate-100 p-3">
            <p className="mb-1 text-xs font-semibold text-slate-500">
              Entry DAE-List (nếu có)
            </p>
            {dae.loading && <p className="text-xs text-slate-400">Đang tải DAE-List…</p>}
            {dae.error && (
              <p className="text-xs text-red-600">
                Không tải được DAE-List cho tập mục này: {dae.error}
              </p>
            )}
            {dae.data && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                    <th className="py-1.5">tid</th>
                    <th className="py-1.5 text-right">u</th>
                    <th className="py-1.5 text-right">ae/dae</th>
                  </tr>
                </thead>
                <tbody>
                  {dae.data.entries.map((e) => (
                    <tr key={e.tid} className="border-b border-slate-50 last:border-b-0">
                      <td className="py-1.5 font-mono">T{e.tid}</td>
                      <td className="py-1.5 text-right tabular-nums">{e.u}</td>
                      <td className="py-1.5 text-right font-mono tabular-nums">{fmt(e.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <p className="text-[11px] text-slate-400">
            Điều kiện HAEI: <code>Sdae ≥ minae</code>. Điều kiện mở rộng:{" "}
            <code>STDAEUB ≥ minae</code> — một tập mục có thể là HAEI nhưng không còn khả năng
            mở rộng (vd: {fmtItemset(["c"])} với STDAEUB = 0 trong ví dụ tài liệu).
          </p>
        </div>
      )}
    </Dialog>
  );
}

function MetricTooltipInline() {
  return (
    <span className="font-semibold text-slate-600" title="Kết luận từ thuật toán/backend">
      Kết luận:
    </span>
  );
}
