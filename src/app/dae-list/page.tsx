"use client";

import { useAsync } from "@/hooks/useAsync";
import { DemoBanner, PageHeader } from "@/components/shared/PageHeader";
import { Input, Select } from "@/components/ui/Controls";
import { Card } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Dialog } from "@/components/ui/Dialog";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { ColumnHeader } from "@/components/ui/MetricTooltip";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { getDaeNode, listDaeNodes } from "@/lib/services/daeListService";
import type { DaeListEntry, DaeListNode, DaeNodeStatus } from "@/lib/types";
import { cn, fmt, fmtItemset } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const SORT_OPTIONS = [
  { value: "itemset", label: "Tập mục" },
  { value: "inv", label: "Inv" },
  { value: "pi", label: "PI" },
  { value: "sdae", label: "Sdae" },
  { value: "smdaeub", label: "SMDAEUB" },
  { value: "stdaeub", label: "STDAEUB" },
  { value: "entries", label: "Số entry" },
] as const;

export default function DaeListPage() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState<DaeNodeStatus | "all">("all");
  const [sort, setSort] = useState<{ key: string; order: "asc" | "desc" }>({
    key: "itemset",
    order: "asc",
  });
  const [selected, setSelected] = useState<string[] | null>(null);

  const list = useAsync(
    (signal) =>
      listDaeNodes(
        {
          search,
          status,
          sort: sort.key as (typeof SORT_OPTIONS)[number]["value"],
          order: sort.order,
        },
        signal,
      ),
    [search, status, sort],
  );

  const columns: Column<DaeListNode>[] = useMemo(
    () => [
      {
        key: "itemset",
        header: "Itemset",
        sortable: true,
        render: (n) => (
          <span className="font-mono font-semibold text-slate-800">{fmtItemset(n.itemset)}</span>
        ),
      },
      {
        key: "inv",
        header: (
          <ColumnHeader
            label="Inv"
            tooltip={{
              description: "Tổng chi phí đầu tư của tập mục: Σ inv(i).",
            }}
          />
        ),
        sortable: true,
        align: "right",
        render: (n) => <span className="font-mono">{n.inv}</span>,
      },
      {
        key: "pi",
        header: (
          <ColumnHeader
            label="PI"
            tooltip={{
              description:
                "Chi phí đầu tư của tiền tố chung — dùng khi ghép hai DAE-List.",
            }}
          />
        ),
        sortable: true,
        align: "right",
        render: (n) => <span className="font-mono">{n.pi}</span>,
      },
      {
        key: "sdae",
        header: (
          <ColumnHeader
            label="Sdae"
            tooltip={{
              formula: "Sdae = Σ ae·f^(Ltid−tid)",
              description: "Tổng hiệu suất trung bình suy giảm của tập mục.",
            }}
          />
        ),
        sortable: true,
        align: "right",
        render: (n) => <span className="font-mono text-blue-700">{fmt(n.sdae)}</span>,
      },
      {
        key: "smdaeub",
        header: (
          <ColumnHeader
            label="SMDAEUB"
            tooltip={{
              description: "Tổng cận trên MDAEUB — dùng lọc ở pha Restructure.",
            }}
          />
        ),
        sortable: true,
        align: "right",
        render: (n) => <span className="font-mono">{fmt(n.smdaeub)}</span>,
      },
      {
        key: "stdaeub",
        header: (
          <ColumnHeader
            label="STDAEUB"
            tooltip={{
              description: "Tổng cận trên TDAEUB — dùng cắt tỉa ở pha Expansion.",
            }}
          />
        ),
        sortable: true,
        align: "right",
        render: (n) => <span className="font-mono">{fmt(n.stdaeub)}</span>,
      },
      {
        key: "entries",
        header: "Số entry",
        sortable: true,
        align: "right",
        render: (n) => n.entryCount,
      },
      {
        key: "status",
        header: "Trạng thái",
        render: (n) => <StatusBadge status={n.status} />,
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="DAE-List Explorer"
        description="Trình khám phá cấu trúc DAE-List: cấp cửa sổ (tập mục) và cấp giao dịch (entry)."
      />
      <DemoBanner source={list.source ?? null} />

      <Card>
        <div className="flex flex-wrap items-end gap-2 border-b border-slate-100 p-3">
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(searchInput);
            }}
          >
            <Input
              label="Tìm tập mục"
              placeholder="VD: bc hoặc {b,c}"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-52"
              name="search"
            />
            <button
              type="submit"
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Tìm
            </button>
          </form>
          <Select
            label="Lọc trạng thái"
            value={status}
            onChange={(e) => setStatus(e.target.value as DaeNodeStatus | "all")}
            className="w-40"
            name="status"
          >
            <option value="all">Tất cả</option>
            <option value="candidate">Ứng viên</option>
            <option value="eliminated">Bị loại</option>
            <option value="haei">HAEI</option>
          </Select>
          <Select
            label="Sắp xếp theo"
            value={sort.key}
            onChange={(e) => setSort((s) => ({ ...s, key: e.target.value }))}
            className="w-44"
            name="sort"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select
            label="Thứ tự"
            value={sort.order}
            onChange={(e) =>
              setSort((s) => ({ ...s, order: e.target.value as "asc" | "desc" }))
            }
            className="w-28"
            name="order"
          >
            <option value="asc">Tăng dần</option>
            <option value="desc">Giảm dần</option>
          </Select>
        </div>

        {list.loading && <LoadingState />}
        {list.error && <ErrorState message={list.error} onRetry={list.reload} />}
        {!list.loading && !list.error && list.data && (
          <DataTable
            columns={columns}
            rows={list.data}
            rowKey={(n) => n.itemset.join(",")}
            onRowClick={(n) => setSelected(n.itemset)}
            sort={sort}
            onSortChange={(key) =>
              setSort((s) => ({
                key,
                order: s.key === key && s.order === "asc" ? "desc" : "asc",
              }))
            }
            emptyMessage="Không có node DAE-List nào khớp bộ lọc. Hãy chạy thuật toán trước."
          />
        )}
      </Card>

      <DaeNodeDialog itemset={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function DaeNodeDialog({
  itemset,
  onClose,
}: {
  itemset: string[] | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const detail = useAsync(
    (signal) => getDaeNode(itemset!, signal),
    [itemset?.join(",")],
    { immediate: itemset !== null },
  );

  return (
    <Dialog
      open={itemset !== null}
      title={itemset ? `DAE-List ${fmtItemset(itemset)}` : ""}
      onClose={onClose}
      width="max-w-3xl"
    >
      {detail.loading && <LoadingState />}
      {detail.error && <ErrorState message={detail.error} />}
      {detail.data && (
        <DaeNodeDetail node={detail.data} onOpenTransaction={(tid) => {
          onClose();
          router.push(`/transactions?tid=${tid}`);
        }} />
      )}
    </Dialog>
  );
}

function DaeNodeDetail({
  node,
  onOpenTransaction,
}: {
  node: DaeListNode;
  onOpenTransaction: (tid: number) => void;
}) {
  const [phaseFilter, setPhaseFilter] = useState<"all" | "construction" | "restructure">("all");
  const entries = node.entries.filter(
    (e) => phaseFilter === "all" || e.phase === phaseFilter,
  );
  const hasTdaeub = node.entries.some((e) => e.tdaeub !== undefined);

  const columns: Column<DaeListEntry>[] = [
    {
      key: "tid",
      header: "tid",
      render: (e) => (
        <button
          type="button"
          onClick={() => onOpenTransaction(e.tid)}
          className="rounded font-mono text-blue-600 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          title="Xem giao dịch nguồn"
        >
          T{e.tid}
        </button>
      ),
    },
    { key: "u", header: "u", align: "right", render: (e) => e.u },
    {
      key: "value",
      header: (
        <ColumnHeader
          label="ae / dae"
          tooltip={{
            description:
              "Ở pha Construction lưu ae thô (u/Inv); ở pha Restructure lưu dae = ae × f^(Ltid−tid).",
          }}
        />
      ),
      align: "right",
      render: (e) => (
        <span className={cn("font-mono", e.phase === "restructure" ? "text-blue-700" : "text-slate-600")}>
          {fmt(e.value)}
        </span>
      ),
    },
    {
      key: "phase",
      header: "Pha",
      render: (e) => (
        <Badge variant={e.phase === "construction" ? "amber" : "blue"}>
          {e.phase === "construction" ? "Construction (thô)" : "Restructure"}
        </Badge>
      ),
    },
    {
      key: "maxru",
      header: (
        <ColumnHeader
          label="maxru"
          tooltip={{ description: "Tiện ích còn lại lớn nhất (maxRU) trong giao dịch." }}
        />
      ),
      align: "right",
      render: (e) => <span className="font-mono">{e.maxru !== undefined ? fmt(e.maxru) : "—"}</span>,
    },
    {
      key: "minInv",
      header: (
        <ColumnHeader
          label="minInv"
          tooltip={{ description: "Chi phí đầu tư nhỏ nhất còn lại trong giao dịch." }}
        />
      ),
      align: "right",
      render: (e) => <span className="font-mono">{e.minInv !== undefined ? fmt(e.minInv) : "—"}</span>,
    },
    {
      key: "pu",
      header: (
        <ColumnHeader
          label="PU"
          tooltip={{ description: "Tiện ích của tiền tố chung (dùng khi ghép)." }}
        />
      ),
      align: "right",
      render: (e) => <span className="font-mono">{e.pu !== undefined ? fmt(e.pu) : "—"}</span>,
    },
    {
      key: "mdaeub",
      header: (
        <ColumnHeader
          label="MDAEUB"
          tooltip={{
            description: "Cận trên suy giảm cực đại = MAEUB thô × trọng số suy giảm.",
          }}
        />
      ),
      align: "right",
      render: (e) => <span className="font-mono">{e.mdaeub !== undefined ? fmt(e.mdaeub) : "—"}</span>,
    },
    {
      key: "k",
      header: (
        <ColumnHeader
          label="k"
          tooltip={{ description: "Số mục còn lại phía sau tập mục trong giao dịch." }}
        />
      ),
      align: "right",
      render: (e) => <span className="font-mono">{e.k !== undefined ? e.k : "—"}</span>,
    },
    ...(hasTdaeub
      ? [
          {
            key: "tdaeub",
            header: (
              <ColumnHeader
                label="TDAEUB"
                tooltip={{
                  description: "Cận trên TDAEUB cấp giao dịch (tính ở bước duyệt ngược).",
                }}
              />
            ),
            align: "right" as const,
            render: (e: DaeListEntry) => (
              <span className="font-mono">{e.tdaeub !== undefined ? fmt(e.tdaeub) : "—"}</span>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-3">
      {/* Cấp cửa sổ */}
      <div className="rounded-lg border border-slate-100 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-slate-500">Cấp cửa sổ (toàn cục)</p>
          <StatusBadge status={node.status} />
        </div>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-5">
          <WinItem label="Inv" value={String(node.inv)} />
          <WinItem label="PI" value={String(node.pi)} />
          <WinItem label="Sdae" value={fmt(node.sdae)} highlight />
          <WinItem label="SMDAEUB" value={fmt(node.smdaeub)} />
          <WinItem label="STDAEUB" value={fmt(node.stdaeub)} />
        </dl>
      </div>

      {/* Cấp giao dịch */}
      <div>
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-slate-500">
            Cấp giao dịch ({node.entries.length} entry)
          </p>
          <Select
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value as typeof phaseFilter)}
            className="h-8 w-48 text-xs"
            name="phaseFilter"
            aria-label="Lọc theo pha"
          >
            <option value="all">Tất cả pha</option>
            <option value="construction">Construction (thô)</option>
            <option value="restructure">Restructure (suy giảm)</option>
          </Select>
        </div>
        {entries.length === 0 ? (
          <EmptyState title="Không có entry nào" />
        ) : (
          <DataTable columns={columns} rows={entries} rowKey={(e) => e.tid} dense />
        )}
      </div>

      <p className="text-[11px] text-slate-400">
        Nhấn vào mã TID để xem giao dịch nguồn. Các ô “—” là giá trị backend chưa cung cấp
        (tài liệu ví dụ không nêu đầy đủ cho từng entry).
      </p>
    </div>
  );
}

function WinItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <dt className="text-[11px] text-slate-400">{label}</dt>
      <dd
        className={cn(
          "font-mono",
          highlight ? "text-base font-bold text-blue-700" : "text-slate-800",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
