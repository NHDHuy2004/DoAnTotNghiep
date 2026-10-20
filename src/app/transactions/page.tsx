"use client";

import { useAsync } from "@/hooks/useAsync";
import { DemoBanner, PageHeader } from "@/components/shared/PageHeader";
import { Button, Input, Select } from "@/components/ui/Controls";
import { Card } from "@/components/ui/Card";
import { DataTable, Pagination, type Column } from "@/components/ui/DataTable";
import { Dialog } from "@/components/ui/Dialog";
import { Badge } from "@/components/ui/Badge";
import { ErrorState, LoadingState } from "@/components/ui/States";
import {
  createTransaction,
  getTransaction,
  importTransactions,
  listTransactions,
  validateInput,
} from "@/lib/services/transactionService";
import type { Transaction, TransactionInput, TransactionItem } from "@/lib/types";
import { Plus, Search, Upload, Eye } from "lucide-react";
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
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState<"all" | "processed" | "pending">("all");
  const pageSize = 10;

  // Nhận ?tid= từ trang DAE-List (nhấn entry → xem giao dịch nguồn)
  const tidParam = searchParams.get("tid");
  const urlTid =
    tidParam !== null && Number.isFinite(Number(tidParam)) ? Number(tidParam) : null;
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

  const columns: Column<Transaction>[] = useMemo(
    () => [
      {
        key: "tid",
        header: "TID",
        className: "w-16 font-mono font-semibold text-slate-800",
        render: (t) => `T${t.tid}`,
      },
      {
        key: "items",
        header: "Items (mục · số lượng)",
        render: (t) => (
          <span className="flex flex-wrap gap-1">
            {t.items.map((it) => (
              <span
                key={it.item}
                className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700"
              >
                ({it.item},{it.quantity})
              </span>
            ))}
          </span>
        ),
      },
      {
        key: "utility",
        header: "Utility từng mục",
        render: (t) => (
          <span className="font-mono text-[11px] text-slate-500">
            ({t.items.map((i) => i.utility).join(",")})
          </span>
        ),
      },
      {
        key: "tu",
        header: "TU",
        align: "right",
        className: "font-semibold text-slate-800",
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
        description="Quản lý luồng giao dịch đầu vào: tìm kiếm, lọc, phân trang, thêm mới và nhập từ CSV/JSON."
        actions={
          <>
            <Button variant="secondary" onClick={() => setImportOpen(true)}>
              <Upload size={15} /> Nhập CSV/JSON
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus size={15} /> Thêm giao dịch
            </Button>
          </>
        }
      />
      <DemoBanner source={list.source ?? null} />

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
              label="Tìm theo TID hoặc mã mục"
              placeholder="VD: T3 hoặc a"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-56"
              name="search"
            />
            <Button type="submit" variant="secondary">
              <Search size={14} /> Tìm
            </Button>
          </form>
          <Select
            label="Lọc trạng thái"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value as typeof status);
            }}
            className="w-40"
            name="status"
          >
            <option value="all">Tất cả</option>
            <option value="processed">Đã xử lý</option>
            <option value="pending">Chờ xử lý</option>
          </Select>
        </div>

        {list.loading && <LoadingState />}
        {list.error && (
          <ErrorState message={list.error} onRetry={list.reload} />
        )}
        {!list.loading && !list.error && list.data && (
          <>
            <DataTable
              columns={columns}
              rows={list.data.items}
              rowKey={(t) => t.tid}
              onRowClick={(t) => setDetailTid(t.tid)}
              emptyMessage="Không có giao dịch nào khớp bộ lọc."
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

      <TransactionDetailDialog tid={effectiveTid} onClose={closeDetail} />
      <AddTransactionDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => list.reload()}
      />
      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => list.reload()}
      />
    </div>
  );
}

/* ---------------- Chi tiết giao dịch ---------------- */

function TransactionDetailDialog({
  tid,
  onClose,
}: {
  tid: number | null;
  onClose: () => void;
}) {
  const detail = useAsync(
    (signal) => getTransaction(tid!, signal),
    [tid],
    { immediate: tid !== null },
  );

  return (
    <Dialog
      open={tid !== null}
      title={tid !== null ? `Chi tiết giao dịch T${tid}` : ""}
      onClose={onClose}
    >
      {detail.loading && <LoadingState />}
      {detail.error && <ErrorState message={detail.error} />}
      {detail.data && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 text-sm">
            <span>
              <span className="text-slate-500">TID:</span>{" "}
              <strong className="font-mono">T{detail.data.tid}</strong>
            </span>
            <span>
              <span className="text-slate-500">TU:</span>{" "}
              <strong>{detail.data.tu}</strong>
            </span>
            <span>
              <span className="text-slate-500">Số mục:</span>{" "}
              <strong>{detail.data.items.length}</strong>
            </span>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="py-2">Mục</th>
                <th className="py-2 text-right">Quantity</th>
                <th className="py-2 text-right">Utility</th>
              </tr>
            </thead>
            <tbody>
              {detail.data.items.map((it: TransactionItem) => (
                <tr key={it.item} className="border-b border-slate-50 last:border-b-0">
                  <td className="py-2 font-mono font-semibold text-slate-800">{it.item}</td>
                  <td className="py-2 text-right tabular-nums">{it.quantity}</td>
                  <td className="py-2 text-right tabular-nums">{it.utility}</td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-semibold">
                <td className="py-2">Tổng (TU)</td>
                <td />
                <td className="py-2 text-right tabular-nums">{detail.data.tu}</td>
              </tr>
            </tbody>
          </table>

          <p className="text-xs text-slate-400">
            Trạng thái:{" "}
            {detail.data.processed
              ? "đã được đưa vào DAE-List."
              : "chờ xử lý ở pha Construction."}
          </p>
        </div>
      )}
    </Dialog>
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
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Đang lưu…" : "Thêm"}
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        {rows.map((row, idx) => (
          <div key={idx} className="flex items-end gap-2">
            <Input
              label={idx === 0 ? "Mục" : undefined}
              placeholder="a"
              value={row.item}
              onChange={(e) => update(idx, { item: e.target.value })}
              className="w-24"
              name={`item-${idx}`}
            />
            <Input
              label={idx === 0 ? "Số lượng" : undefined}
              type="number"
              min={1}
              value={row.quantity}
              onChange={(e) => update(idx, { quantity: Number(e.target.value) })}
              className="w-24"
              name={`qty-${idx}`}
            />
            <Input
              label={idx === 0 ? "Utility" : undefined}
              type="number"
              value={row.utility}
              onChange={(e) => update(idx, { utility: Number(e.target.value) })}
              className="w-28"
              name={`util-${idx}`}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRows((r) => r.filter((_, i) => i !== idx))}
              disabled={rows.length === 1}
            >
              Xóa
            </Button>
          </div>
        ))}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setRows((r) => [...r, { item: "", quantity: 1, utility: 0 }])}
        >
          + Thêm dòng
        </Button>
        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
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
  onImported: () => void;
}) {
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [content, setContent] = useState("");
  const [errors, setErrors] = useState<{ line: number; message: string }[]>([]);
  const [imported, setImported] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

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
      if (res.data.imported > 0) onImported();
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
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
          <Button onClick={submit} disabled={busy || !content.trim()}>
            {busy ? "Đang nhập…" : "Nhập"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Select
          label="Định dạng"
          value={format}
          onChange={(e) => setFormat(e.target.value as "csv" | "json")}
          className="w-40"
          name="format"
        >
          <option value="csv">CSV (mỗi dòng 1 giao dịch)</option>
          <option value="json">JSON (mảng giao dịch)</option>
        </Select>
        <div>
          <label htmlFor="import-content" className="text-xs font-medium text-slate-600">
            Nội dung
          </label>
          <textarea
            id="import-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            placeholder={sample}
            className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 font-mono text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          <p className="mt-1 text-[11px] text-slate-400">
            CSV: <code>item,quantity,utility</code> cách nhau bằng <code>;</code> cho mỗi dòng.
            JSON: mảng <code>{"{ items: [{item, quantity, utility}] }"}</code>.
          </p>
        </div>

        {imported !== null && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            Đã nhập {imported} giao dịch.
          </p>
        )}
        {errors.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <p className="font-semibold">{errors.length} dòng có lỗi:</p>
            <ul className="mt-1 list-inside list-disc">
              {errors.map((e, i) => (
                <li key={i}>
                  Dòng {e.line}: {e.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Dialog>
  );
}
