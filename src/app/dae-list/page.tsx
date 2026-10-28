"use client";

import { useAsync } from "@/hooks/useAsync";
import { DemoBanner, PageHeader } from "@/components/shared/PageHeader";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button, SearchField, Select } from "@/components/ui/Controls";
import { Card } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Dialog";
import { FilterBar, SegmentedControl } from "@/components/ui/FilterBar";
import { MetaItem } from "@/components/ui/Meta";
import { ColumnHeader } from "@/components/ui/MetricTooltip";
import { EmptyState, ErrorState, LoadingState, TableSkeleton } from "@/components/ui/States";
import { getDaeNode, listDaeNodes } from "@/lib/services/daeListService";
import type { DaeListEntry, DaeListNode, DaeNodeStatus } from "@/lib/types";
import { cn, fmt, fmtItemset } from "@/lib/utils";
import { ExternalLink, Layers, SearchX } from "lucide-react";
import Link from "next/link";
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

const STATUS_LABEL: Record<DaeNodeStatus | "all", string> = {
  all: "Tất cả trạng thái",
  candidate: "Ứng viên",
  eliminated: "Bị loại",
  haei: "HAEI",
};

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

  const DEFAULT_SORT = { key: "itemset", order: "asc" } as const;
  const hasFilter =
    search !== "" || status !== "all" || sort.key !== DEFAULT_SORT.key || sort.order !== DEFAULT_SORT.order;
  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatus("all");
    setSort({ key: DEFAULT_SORT.key, order: DEFAULT_SORT.order });
  };

  const columns: Column<DaeListNode>[] = useMemo(
    () => [
      {
        key: "itemset",
        header: "Itemset",
        sortable: true,
        render: (n) => (
          <span className="font-mono font-semibold text-ink">{fmtItemset(n.itemset)}</span>
        ),
      },
      {
        key: "inv",
        header: "Inv",
        sortable: true,
        tooltip: <ColumnHeader label="" metricKey="inv" />,
        align: "right",
        render: (n) => <span className="font-mono">{n.inv}</span>,
      },
      {
        key: "pi",
        header: "PI",
        sortable: true,
        tooltip: <ColumnHeader label="" metricKey="pi" />,
        align: "right",
        hideOnMobile: true,
        render: (n) => <span className="font-mono">{n.pi}</span>,
      },
      {
        key: "sdae",
        header: "Sdae",
        sortable: true,
        tooltip: <ColumnHeader label="" metricKey="sdae" />,
        align: "right",
        render: (n) => <span className="font-mono font-medium text-brand">{fmt(n.sdae)}</span>,
      },
      {
        key: "smdaeub",
        header: "SMDAEUB",
        sortable: true,
        tooltip: <ColumnHeader label="" metricKey="smdaeub" />,
        align: "right",
        hideOnMobile: true,
        render: (n) => <span className="font-mono">{fmt(n.smdaeub)}</span>,
      },
      {
        key: "stdaeub",
        header: "STDAEUB",
        sortable: true,
        tooltip: <ColumnHeader label="" metricKey="stdaeub" />,
        align: "right",
        hideOnMobile: true,
        render: (n) => (
          <span className={cn("font-mono", n.stdaeub === 0 && "text-ink-3")}>
            {n.stdaeub !== undefined ? fmt(n.stdaeub) : "—"}
          </span>
        ),
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
        description="Trình khám phá cấu trúc DAE-List: cấp cửa sổ (tập mục) và cấp giao dịch (entry). Nhấn một hàng để mở chi tiết."
        badges={list.data ? <Badge variant="gray">{list.data.length} node</Badge> : undefined}
      />
      <DemoBanner source={list.source ?? null} />

      <Card>
        <FilterBar
          onReset={hasFilter ? resetFilters : undefined}
          meta={list.data ? `${list.data.length} kết quả` : undefined}
        >
          <SearchField
            label="Tìm tập mục"
            placeholder="VD: bc hoặc {b,c}"
            value={searchInput}
            onChange={(v) => {
              setSearchInput(v);
              // Bấm ✕ xóa cả bộ lọc đã áp dụng (không chỉ ô nhập)
              if (!v) setSearch("");
            }}
            onSubmit={() => setSearch(searchInput.trim())}
            className="w-full sm:w-72"
          />
          <Select
            label="Trạng thái"
            value={status}
            onChange={(e) => setStatus(e.target.value as DaeNodeStatus | "all")}
            className="w-full sm:w-44"
            name="status"
          >
            <option value="all">{STATUS_LABEL.all}</option>
            <option value="candidate">{STATUS_LABEL.candidate}</option>
            <option value="eliminated">{STATUS_LABEL.eliminated}</option>
            <option value="haei">{STATUS_LABEL.haei}</option>
          </Select>
          <Select
            label="Sắp xếp theo"
            value={sort.key}
            onChange={(e) => setSort((s) => ({ ...s, key: e.target.value }))}
            className="w-full sm:w-44"
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
            onChange={(e) => setSort((s) => ({ ...s, order: e.target.value as "asc" | "desc" }))}
            className="w-full sm:w-32"
            name="order"
          >
            <option value="asc">Tăng dần</option>
            <option value="desc">Giảm dần</option>
          </Select>
        </FilterBar>

        {list.loading && <TableSkeleton rows={8} cols={7} />}
        {list.error && (
          <div className="p-4">
            <ErrorState message={list.error} onRetry={list.reload} />
          </div>
        )}
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
            maxHeight="60vh"
            caption="Danh sách node DAE-List"
            emptyMessage="Không có node DAE-List nào khớp bộ lọc."
            emptyAction={
              hasFilter ? (
                <Button variant="secondary" size="sm" onClick={resetFilters}>
                  <SearchX size={13} /> Xóa bộ lọc
                </Button>
              ) : (
                <Link href="/execution">
                  <Button variant="secondary" size="sm">
                    <Layers size={13} /> Đi tới trang Thực thi
                  </Button>
                </Link>
              )
            }
          />
        )}
        {!list.loading && !list.error && list.data && list.data.length > 0 && (
          <p className="border-t border-line px-4 py-2.5 text-[11px] text-ink-3">
            Nhấn một hàng để xem chi tiết node và danh sách entry cấp giao dịch.
          </p>
        )}
      </Card>

      <DaeNodeDrawer itemset={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

/* ---------------- Chi tiết node (Drawer) ---------------- */

function DaeNodeDrawer({ itemset, onClose }: { itemset: string[] | null; onClose: () => void }) {
  const router = useRouter();
  const detail = useAsync(
    (signal) => getDaeNode(itemset!, signal),
    [itemset?.join(",")],
    { immediate: itemset !== null },
  );

  return (
    <Drawer
      open={itemset !== null}
      title={itemset ? `DAE-List ${fmtItemset(itemset)}` : ""}
      description="Cấp cửa sổ (toàn cục) và các entry cấp giao dịch."
      onClose={onClose}
      size="max-w-3xl"
    >
      {detail.loading && <LoadingState />}
      {detail.error && <ErrorState message={detail.error} onRetry={detail.reload} />}
      {detail.data && (
        <DaeNodeDetail
          node={detail.data}
          onOpenTransaction={(tid) => {
            onClose();
            router.push(`/transactions?tid=${tid}`);
          }}
        />
      )}
    </Drawer>
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
          className="inline-flex items-center gap-1 rounded font-mono text-brand underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
          title="Xem giao dịch nguồn"
        >
          T{e.tid}
          <ExternalLink size={11} />
        </button>
      ),
    },
    { key: "u", header: "u", align: "right", render: (e) => e.u },
    {
      key: "value",
      header: <ColumnHeader label="ae / dae" metricKey="dae" />,
      align: "right",
      render: (e) => (
        <span className={cn("font-mono", e.phase === "restructure" ? "text-brand" : "text-ink-2")}>
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
      header: <ColumnHeader label="maxru" metricKey="maxru" />,
      align: "right",
      hideOnMobile: true,
      render: (e) => <span className="font-mono">{e.maxru !== undefined ? fmt(e.maxru) : "—"}</span>,
    },
    {
      key: "minInv",
      header: <ColumnHeader label="minInv" metricKey="minInv" />,
      align: "right",
      hideOnMobile: true,
      render: (e) => (
        <span className="font-mono">{e.minInv !== undefined ? fmt(e.minInv) : "—"}</span>
      ),
    },
    {
      key: "pu",
      header: <ColumnHeader label="PU" metricKey="pu" />,
      align: "right",
      hideOnMobile: true,
      render: (e) => <span className="font-mono">{e.pu !== undefined ? fmt(e.pu) : "—"}</span>,
    },
    {
      key: "mdaeub",
      header: <ColumnHeader label="MDAEUB" metricKey="mdaeub" />,
      align: "right",
      hideOnMobile: true,
      render: (e) => (
        <span className="font-mono">{e.mdaeub !== undefined ? fmt(e.mdaeub) : "—"}</span>
      ),
    },
    {
      key: "k",
      header: <ColumnHeader label="k" metricKey="k" />,
      align: "right",
      hideOnMobile: true,
      render: (e) => <span className="font-mono">{e.k !== undefined ? e.k : "—"}</span>,
    },
    ...(hasTdaeub
      ? [
          {
            key: "tdaeub",
            header: <ColumnHeader label="TDAEUB" metricKey="tdaeub" />,
            align: "right" as const,
            hideOnMobile: true,
            render: (e: DaeListEntry) => (
              <span className="font-mono">{e.tdaeub !== undefined ? fmt(e.tdaeub) : "—"}</span>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      {/* Cấp cửa sổ */}
      <section className="rounded-lg border border-line bg-surface-2/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-semibold tracking-[0.01em] text-ink-3">
            Cấp cửa sổ (toàn cục)
          </p>
          <StatusBadge status={node.status} />
        </div>
        <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-5">
          <MetaItem mono label="Inv" value={String(node.inv)} />
          <MetaItem mono label="PI" value={String(node.pi)} />
          <MetaItem mono label="Sdae" value={fmt(node.sdae)} emphasized metricKey="sdae" />
          <MetaItem mono label="SMDAEUB" value={fmt(node.smdaeub)} metricKey="smdaeub" />
          <MetaItem mono label="STDAEUB" value={node.stdaeub !== undefined ? fmt(node.stdaeub) : "—"} metricKey="stdaeub" />
        </dl>
      </section>

      {/* Cấp giao dịch */}
      <section className="rounded-lg border border-line bg-surface-2/60 p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-semibold tracking-[0.01em] text-ink-3">
            Cấp giao dịch · {node.entries.length} entry
          </p>
          <SegmentedControl
            ariaLabel="Lọc entry theo pha"
            value={phaseFilter}
            onChange={setPhaseFilter}
            options={[
              { value: "all", label: "Tất cả" },
              { value: "construction", label: "Construction" },
              { value: "restructure", label: "Restructure" },
            ]}
          />
        </div>
        {entries.length === 0 ? (
          <EmptyState title="Không có entry nào ở pha này" />
        ) : (
          <DataTable
            columns={columns}
            rows={entries}
            rowKey={(e) => e.tid}
            dense
            caption="Entry cấp giao dịch của node"
          />
        )}
      </section>

      <p className="border-t border-line pt-3 text-[11px] leading-relaxed text-ink-3">
        Nhấn mã TID để mở giao dịch nguồn. Ô “—” là giá trị backend chưa cung cấp cho entry đó
        (tài liệu ví dụ không nêu đầy đủ).
      </p>
    </div>
  );
}

