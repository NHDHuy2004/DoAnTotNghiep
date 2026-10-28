"use client";

import { useAsync } from "@/hooks/useAsync";
import { DemoBanner, PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button, Input, SearchField, Select, Textarea } from "@/components/ui/Controls";
import { Card } from "@/components/ui/Card";
import { DataTable, Pagination, type Column } from "@/components/ui/DataTable";
import { Dialog, Drawer } from "@/components/ui/Dialog";
import { FilterBar } from "@/components/ui/FilterBar";
import { MetaItem } from "@/components/ui/Meta";
import { ErrorState, LoadingState, TableSkeleton } from "@/components/ui/States";
import { InlineAlert, useToast } from "@/components/ui/Toast";
import {
  createTransaction,
  getTransaction,
  importTransactions,
  listTransactions,
  validateInput,
} from "@/lib/services/transactionService";
import type { Transaction, TransactionInput, TransactionItem } from "@/lib/types";
import { Eye, FileUp, Plus, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

export default function TransactionsPage() {
  return (
    <Suspense fallback={<LoadingState label="Đang tải dữ liệu giao dịch…" />}>
      <TransactionsView />
    </Suspense>
  );
}

function TransactionsView() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState<"all" | "processed" | "pending">("all");
  const pageSize = 10;

  // Nhận ?tid= từ trang DAE-List (nhấn entry → xem giao dịch nguồn)
  const tidParam = searchParams.get("tid");
  // Chỉ chấp nhận số nguyên dương: "?tid=", "?tid=abc", "?tid=1.5" → bỏ qua
  const urlTid = tidParam !== null && /^\d+$/.test(tidParam) ? Number(tidParam) : null;
  const [detailTid, setDetailTid] = useState<number | null>(null);
  const [dismissedUrlTid, setDismissedUrlTid] = useState<number | null>(null);
  const effectiveTid =
    detailTid ?? (urlTid !== null && urlTid !== dismissedUrlTid ? urlTid : null);
  const closeDetail = () => {
    setDetailTid(null);
    if (urlTid !== null) setDismissedUrlTid(urlTid);
  };

  const list = useAsync(
    (signal) =>
      listTransactions(
        {
          page,
          pageSize,
          search,
          processed: status === "all" ? undefined : status === "processed",
        },
        signal,
      ),
    [page, search, status],
  );

  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const hasFilter = search !== "" || status !== "all";
  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatus("all");
    setPage(1);
  };

  const columns: Column<Transaction>[] = useMemo(
    () => [
      {
        key: "tid",
        header: "TID",
        className: "w-20 font-mono font-semibold text-ink",
        render: (t) => <span className="text-ink">T{t.tid}</span>,
      },
      {
        key: "items",
        header: "Items (mục · số lượng)",
        render: (t) => (
          <span className="flex flex-wrap gap-1">
            {t.items.map((it) => (
              <span
                key={it.item}
                title={`mục ${it.item} · số lượng ${it.quantity} · utility ${it.utility}`}
                className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[11px] text-ink-2"
              >
                {it.item}<span className="text-ink-3"> ×{it.quantity}</span>
              </span>
            ))}
          </span>
        ),
      },
      {
        key: "utility",
        header: "Utility từng mục",
        hideOnMobile: true,
        render: (t) => (
          <span className="font-mono text-[11px] text-ink-3">
            ({t.items.map((i) => i.utility).join(", ")})
          </span>
        ),
      },
      {
        key: "tu",
        header: "TU",
        align: "right",
        className: "font-semibold text-ink",
        render: (t) => t.tu,
      },
      {
        key: "status",
        header: "Trạng thái",
        render: (t) =>
          t.processed ? (
            <Badge variant="green">Đã xử lý</Badge>
          ) : (
            <Badge variant="amber">Chờ xử lý</Badge>
          ),
      },
      {
        key: "actions",
        header: "Thao tác",
        align: "center",
        render: (t) => (
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Xem chi tiết giao dịch T${t.tid}`}
            onClick={(e) => {
              e.stopPropagation();
              setDetailTid(t.tid);
            }}
          >
            <Eye size={13} /> Chi tiết
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="Dữ liệu giao dịch"
        description="Luồng giao dịch đầu vào: tìm kiếm, lọc trạng thái, thêm mới và nhập khẩu từ CSV/JSON."
        actions={
          <>
            <Button variant="secondary" onClick={() => setImportOpen(true)}>
              <FileUp size={15} /> Nhập CSV/JSON
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus size={15} /> Thêm giao dịch
            </Button>
          </>
        }
      />
      <DemoBanner source={list.source ?? null} />

      <Card>
        <FilterBar
          onReset={hasFilter ? resetFilters : undefined}
          meta={list.data ? `${list.data.total} giao dịch` : undefined}
        >
          <SearchField
            label="Tìm theo TID hoặc mã mục"
            placeholder="VD: T3 hoặc a"
            value={searchInput}
            onChange={(v) => {
              setSearchInput(v);
              // Bấm ✕ xóa cả bộ lọc đã áp dụng (không chỉ ô nhập)
              if (!v) {
                setSearch("");
                setPage(1);
              }
            }}
            onSubmit={() => {
              setPage(1);
              setSearch(searchInput.trim());
            }}
            className="w-full sm:w-72"
          />
          <Select
            label="Lọc trạng thái"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value as typeof status);
            }}
            className="w-full sm:w-44"
            name="status"
          >
            <option value="all">Tất cả</option>
            <option value="processed">Đã xử lý</option>
            <option value="pending">Chờ xử lý</option>
          </Select>
        </FilterBar>

        {list.loading && <TableSkeleton rows={6} cols={6} />}
        {list.error && <div className="p-4"><ErrorState message={list.error} onRetry={list.reload} /></div>}
        {!list.loading && !list.error && list.data && (
          <>
            <DataTable
              columns={columns}
              rows={list.data.items}
              rowKey={(t) => t.tid}
              onRowClick={(t) => setDetailTid(t.tid)}
              caption="Danh sách giao dịch"
              emptyMessage="Không có giao dịch nào khớp bộ lọc."
              emptyAction={
                hasFilter ? (
                  <Button variant="secondary" size="sm" onClick={resetFilters}>
                    Xóa bộ lọc
                  </Button>
                ) : undefined
              }
            />
            <Pagination
              page={list.data.page}
              pageSize={list.data.pageSize}
              total={list.data.total}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      <TransactionDetailDrawer tid={effectiveTid} onClose={closeDetail} />
      <AddTransactionDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => {
          list.reload();
          toast.success("Đã thêm giao dịch", "Giao dịch mới đã được đưa vào danh sách.");
        }}
      />
      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={(count) => {
          list.reload();
          toast.success(`Đã nhập ${count} giao dịch`);
        }}
      />
    </div>
  );
}

/* ---------------- Chi tiết giao dịch (Drawer) ---------------- */

function TransactionDetailDrawer({ tid, onClose }: { tid: number | null; onClose: () => void }) {
  const detail = useAsync(
    (signal) => getTransaction(tid!, signal),
    [tid],
    { immediate: tid !== null },
  );

  return (
    <Drawer
      open={tid !== null}
      title={tid !== null ? `Chi tiết giao dịch T${tid}` : ""}
      description="Thông tin đầy đủ của giao dịch nguồn."
      onClose={onClose}
      size="max-w-lg"
    >
      {detail.loading && <LoadingState />}
      {detail.error && <ErrorState message={detail.error} />}
      {detail.data && (
        <div className="space-y-4">
          <dl className="grid grid-cols-3 gap-3">
            <MetaItem variant="boxed" label="TID" value={`T${detail.data.tid}`} mono />
            <MetaItem variant="boxed" label="TU" value={String(detail.data.tu)} mono />
            <MetaItem variant="boxed" label="Số mục" value={String(detail.data.items.length)} mono />
          </dl>

          <div className="overflow-hidden rounded-lg border border-line">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-left text-[11px] tracking-[0.01em] text-ink-3">
                  <th className="px-3 py-2 font-semibold">Mục</th>
                  <th className="px-3 py-2 text-right font-semibold">Quantity</th>
                  <th className="px-3 py-2 text-right font-semibold">Utility</th>
                </tr>
              </thead>
              <tbody>
                {detail.data.items.map((it: TransactionItem) => (
                  <tr key={it.item} className="border-b border-line last:border-b-0">
                    <td className="px-3 py-2.5 font-mono font-semibold text-ink">{it.item}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{it.quantity}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{it.utility}</td>
                  </tr>
                ))}
                <tr className="bg-surface-2 font-semibold">
                  <td className="px-3 py-2.5 text-ink">Tổng (TU)</td>
                  <td />
                  <td className="px-3 py-2.5 text-right tabular-nums text-ink">{detail.data.tu}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <InlineAlert kind="info" title="Trạng thái xử lý">
            {detail.data.processed
              ? "Giao dịch đã được đưa vào DAE-List."
              : "Chờ xử lý ở pha Construction."}
          </InlineAlert>
        </div>
      )}
    </Drawer>
  );
}

/* ---------------- Thêm giao dịch ---------------- */

function AddTransactionDialog({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [rows, setRows] = useState<TransactionItem[]>([
    { item: "", quantity: 1, utility: 0 },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Mở lại hộp thoại → không hiển thị lỗi của lần trước
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open && error) setError(null);
  }

  const update = (idx: number, patch: Partial<TransactionItem>) => {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };

  const submit = async () => {
    const input: TransactionInput = {
      items: rows
        .filter((r) => r.item.trim())
        .map((r) => ({ ...r, item: r.item.trim() })),
    };
    const v = validateInput(input);
    if (v) {
      setError(v);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createTransaction(input);
      setRows([{ item: "", quantity: 1, utility: 0 }]);
      onAdded();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      title="Thêm giao dịch mới"
      description="Mỗi dòng gồm một mục, số lượng và utility tương ứng."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button onClick={submit} loading={saving}>
            {saving ? "Đang lưu…" : "Thêm giao dịch"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-[1fr_72px_88px_36px] gap-2 text-[11px] font-medium text-ink-3">
          <span>Mục</span>
          <span className="text-right">Số lượng</span>
          <span className="text-right">Utility</span>
          <span className="sr-only">Xóa</span>
        </div>

        <div className="space-y-2">
          {rows.map((row, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_72px_88px_36px] items-center gap-2">
              <Input
                placeholder="a"
                aria-label={`Mục dòng ${idx + 1}`}
                value={row.item}
                onChange={(e) => update(idx, { item: e.target.value })}
                name={`item-${idx}`}
              />
              <Input
                type="number"
                min={1}
                aria-label={`Số lượng dòng ${idx + 1}`}
                value={Number.isFinite(row.quantity) ? row.quantity : ""}
                onChange={(e) =>
                  update(idx, { quantity: e.target.value === "" ? Number.NaN : Number(e.target.value) })
                }
                name={`qty-${idx}`}
              />
              <Input
                type="number"
                aria-label={`Utility dòng ${idx + 1}`}
                value={Number.isFinite(row.utility) ? row.utility : ""}
                onChange={(e) =>
                  update(idx, { utility: e.target.value === "" ? Number.NaN : Number(e.target.value) })
                }
                name={`util-${idx}`}
              />
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Xóa dòng ${idx + 1}`}
                onClick={() => setRows((r) => r.filter((_, i) => i !== idx))}
                disabled={rows.length === 1}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setRows((r) => [...r, { item: "", quantity: 1, utility: 0 }])}
          >
            <Plus size={13} /> Thêm dòng
          </Button>
          <p className="text-[11px] text-ink-3">Dòng để trống sẽ tự bỏ qua.</p>
        </div>

        {error && <InlineAlert kind="error" title="Dữ liệu chưa hợp lệ">{error}</InlineAlert>}
      </div>
    </Dialog>
  );
}

/* ---------------- Nhập CSV/JSON ---------------- */

function ImportDialog({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: (count: number) => void;
}) {
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [content, setContent] = useState("");
  const [errors, setErrors] = useState<{ line: number; message: string }[]>([]);
  const [imported, setImported] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  // Kết quả của lần nhập / định dạng trước không được hiển thị sang lần sau
  const clearResult = () => {
    setErrors([]);
    setImported(null);
  };
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) clearResult();
  }

  const sample =
    format === "csv"
      ? "a,1,4; c,1,5; d,2,4\nb,2,6; c,2,10"
      : '[{"items":[{"item":"a","quantity":1,"utility":4},{"item":"c","quantity":1,"utility":5}]}]';

  const submit = async () => {
    setBusy(true);
    setErrors([]);
    setImported(null);
    try {
      const res = await importTransactions(format, content);
      setImported(res.data.imported);
      setErrors(res.data.errors);
      if (res.data.imported > 0) onImported(res.data.imported);
    } catch (e) {
      setErrors([{ line: 0, message: e instanceof Error ? e.message : String(e) }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      title="Nhập dữ liệu giao dịch từ CSV/JSON"
      description="Mỗi dòng CSV là một giao dịch; lỗi từng dòng sẽ được báo riêng."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Đóng
          </Button>
          <Button onClick={submit} loading={busy} disabled={!content.trim()}>
            {busy ? "Đang nhập…" : "Nhập dữ liệu"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Select
          label="Định dạng"
          value={format}
          onChange={(e) => {
            setFormat(e.target.value as "csv" | "json");
            clearResult();
          }}
          className="w-full sm:w-56"
          name="format"
        >
          <option value="csv">CSV (mỗi dòng 1 giao dịch)</option>
          <option value="json">JSON (mảng giao dịch)</option>
        </Select>

        <Textarea
          label="Nội dung"
          id="import-content"
          rows={7}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={sample}
          hint={
            format === "csv" ? (
              <>
                Mỗi dòng: <code>item,quantity,utility</code>, các mục cách nhau bằng{" "}
                <code>;</code>.
              </>
            ) : (
              <>
                Mảng <code>{`[{ items: [{ item, quantity, utility }] }]`}</code>.
              </>
            )
          }
        />

        {imported !== null && imported > 0 && (
          <InlineAlert kind="success" title="Nhập thành công">
            Đã thêm {imported} giao dịch vào danh sách.
          </InlineAlert>
        )}
        {errors.length > 0 && (
          <InlineAlert kind="error" title={`${errors.length} dòng có lỗi`}>
            <ul className="mt-1 max-h-40 list-inside list-disc space-y-0.5 overflow-y-auto">
              {errors.map((e, i) => (
                <li key={i}>
                  {e.line > 0 ? `Dòng ${e.line}: ` : ""}
                  {e.message}
                </li>
              ))}
            </ul>
          </InlineAlert>
        )}
      </div>
    </Dialog>
  );
}
