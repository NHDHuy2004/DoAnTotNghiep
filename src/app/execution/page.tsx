"use client";

import { useAsync } from "@/hooks/useAsync";
import { DemoBanner, PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Controls";
import { Card, CardBody } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { ColumnHeader } from "@/components/ui/MetricTooltip";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState, ErrorState, LoadingState, NotReadyState } from "@/components/ui/States";
import { useApp } from "@/lib/context/AppContext";
import {
  getConstructionTrace,
  getExpansionTrace,
  getLogs,
  getRestructureTrace,
  startExecution,
  stopExecution,
} from "@/lib/services/algorithmService";
import { pushDemoHistory } from "@/lib/services/executionHistoryService";
import type {
  ConstructionStep,
  ExpansionNode,
  LogEntry,
  PhaseKey,
  PhaseStatus,
  RestructureEntry,
  RestructureNode,
} from "@/lib/types";
import { cn, fmt, fmtItemset } from "@/lib/utils";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  FileText,
  Play,
  RefreshCw,
  Square,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

const PHASE_META: Record<PhaseKey, { title: string; desc: string }> = {
  construction: {
    title: "Construction",
    desc: "Tiếp nhận giao dịch mới, ghi entry cấp giao dịch vào DAE-List với giá trị THÔ (ae, MAEUB) — chưa áp dụng hệ số suy giảm.",
  },
  restructure: {
    title: "Restructure",
    desc: "Áp dụng trọng số suy giảm f^(Ltid−tid), lọc sớm ứng viên (SMDAEUB < minae), sắp xếp tăng dần và tính cận trên TDAEUB.",
  },
  expansion: {
    title: "Expansion",
    desc: "DFS đệ quy: công nhận HAEI (Sdae ≥ minae), cắt tỉa nhánh STDAEUB < minae, ghép DAE-List để sinh tập mục dài hơn.",
  },
};

const PHASE_ORDER: PhaseKey[] = ["construction", "restructure", "expansion"];

function phaseIcon(status: PhaseStatus) {
  switch (status) {
    case "done":
      return <CheckCircle2 size={18} className="text-emerald-500" />;
    case "running":
      return <RefreshCw size={18} className="animate-spin text-amber-500" />;
    case "error":
      return <XCircle size={18} className="text-red-500" />;
    case "stopped":
      return <Square size={18} className="text-slate-400" />;
    default:
      return <Circle size={18} className="text-slate-300" />;
  }
}

export default function ExecutionPage() {
  const { activeSession, setActiveSession, config, demoMode } = useApp();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);

  const sessionId = activeSession?.id ?? null;

  const construction = useAsync(
    (signal) => getConstructionTrace(sessionId!, signal),
    [sessionId],
    { immediate: !!sessionId },
  );
  const restructure = useAsync(
    (signal) => getRestructureTrace(sessionId!, signal),
    [sessionId],
    { immediate: !!sessionId },
  );
  const expansion = useAsync(
    (signal) => getExpansionTrace(sessionId!, signal),
    [sessionId],
    { immediate: !!sessionId },
  );
  const logs = useAsync(
    (signal) => getLogs(sessionId!, signal),
    [sessionId],
    { immediate: !!sessionId },
  );

  const handleStart = async () => {
    if (!config) return;
    setStarting(true);
    setStartError(null);
    try {
      const res = await startExecution(config);
      pushDemoHistory(res.data);
      setActiveSession(res.data);
      construction.reload();
      restructure.reload();
      expansion.reload();
      logs.reload();
    } catch (e) {
      setStartError(e instanceof Error ? e.message : String(e));
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async () => {
    if (!activeSession) return;
    try {
      const res = await stopExecution(activeSession.id);
      setActiveSession(res.data);
      pushDemoHistory(res.data);
    } catch (e) {
      setStartError(e instanceof Error ? e.message : String(e));
    }
  };

  const refreshAll = () => {
    construction.reload();
    restructure.reload();
    expansion.reload();
    logs.reload();
  };

  const statusOf = (phase: PhaseKey): PhaseStatus =>
    activeSession?.phases[phase] ?? "pending";

  const allLoading =
    construction.loading || restructure.loading || expansion.loading;

  return (
    <div>
      <PageHeader
        title="Thực thi thuật toán"
        description="Theo dõi pipeline ba pha Construction → Restructure → Expansion trên luồng giao dịch."
        actions={
          <>
            <Button variant="secondary" onClick={() => setLogsOpen(true)}>
              <FileText size={15} /> Xem log
            </Button>
            <Button variant="secondary" onClick={refreshAll} disabled={!sessionId}>
              <RefreshCw size={15} /> Làm mới
            </Button>
            {activeSession?.status === "running" ? (
              <Button variant="danger" onClick={handleStop}>
                <Square size={15} /> Dừng phiên
              </Button>
            ) : (
              <Button onClick={handleStart} disabled={starting || !config}>
                <Play size={15} />
                {starting ? "Đang khởi tạo…" : activeSession ? "Chạy lại" : "Bắt đầu thực thi"}
              </Button>
            )}
          </>
        }
      />
      <DemoBanner source={construction.source ?? null} />

      {startError && (
        <ErrorState title="Lỗi thực thi" message={startError} onRetry={handleStart} />
      )}

      {!activeSession && !starting && (
        <NotReadyState
          title="Chưa có phiên thực thi"
          description="Hãy cấu hình tham số (f, minae, investmentTable) tại trang Cấu hình thuật toán rồi nhấn “Bắt đầu thực thi”. Nếu backend đã kết nối, phiên sẽ chạy trên dữ liệu thật."
          action={
            <Link href="/config">
              <Button variant="secondary">Đi tới Cấu hình thuật toán</Button>
            </Link>
          }
        />
      )}

      {starting && <LoadingState label="Đang khởi tạo phiên thực thi…" />}

      {activeSession && (
        <>
          {/* Pipeline 3 pha */}
          <div className="grid gap-3 lg:grid-cols-3">
            {PHASE_ORDER.map((phase, i) => (
              <div key={phase} className="flex items-stretch gap-3">
                <PhaseCard
                  phase={phase}
                  status={statusOf(phase)}
                  onRefresh={
                    phase === "construction"
                      ? construction.reload
                      : phase === "restructure"
                        ? restructure.reload
                        : expansion.reload
                  }
                />
                {i < 2 && (
                  <span
                    aria-hidden
                    className="hidden shrink-0 items-center text-slate-300 lg:flex"
                  >
                    <ChevronRight size={20} />
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Thông tin phiên */}
          <Card className="mt-4">
            <CardBody className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <Meta label="Mã phiên" value={activeSession.id} mono />
              <Meta label="Trạng thái" value={<StatusBadge status={activeSession.status} />} />
              <Meta label="Ltid" value={activeSession.ltid} mono />
              <Meta label="Số giao dịch" value={activeSession.transactionCount} />
              <Meta
                label="f"
                value={fmt(activeSession.config.f, 2)}
                mono
              />
              <Meta label="minae" value={fmt(activeSession.config.minae, 3)} mono />
              {activeSession.haeiCount !== undefined && (
                <Meta label="Số HAEI" value={activeSession.haeiCount} />
              )}
            </CardBody>
          </Card>

          {allLoading && <LoadingState label="Đang tải trace các pha…" />}

          {!allLoading && (
            <div className="mt-4 space-y-4">
              {/* PHA 1 */}
              <ConstructionSection
                status={statusOf("construction")}
                data={construction.data}
                error={construction.error}
              />

              {/* PHA 2 */}
              <RestructureSection
                status={statusOf("restructure")}
                data={restructure.data}
                error={restructure.error}
              />

              {/* PHA 3 */}
              <ExpansionSection
                status={statusOf("expansion")}
                data={expansion.data}
                error={expansion.error}
                demoMode={demoMode}
              />
            </div>
          )}
        </>
      )}

      <Dialog open={logsOpen} title="Log thực thi" onClose={() => setLogsOpen(false)} width="max-w-3xl">
        {logs.loading && <LoadingState />}
        {logs.error && <ErrorState message={logs.error} onRetry={logs.reload} />}
        {logs.data && logs.data.length === 0 && (
          <EmptyState
            title="Chưa có log"
            description="Log sẽ xuất hiện sau khi một phiên thực thi được khởi tạo."
          />
        )}
        {logs.data && logs.data.length > 0 && (
          <ul className="space-y-1 font-mono text-xs">
            {logs.data.map((l: LogEntry) => (
              <li key={l.seq} className="flex gap-2">
                <span className="text-slate-400">#{l.seq}</span>
                <span
                  className={cn(
                    l.level === "error" && "text-red-600",
                    l.level === "warn" && "text-amber-600",
                    l.level === "info" && "text-slate-600",
                  )}
                >
                  [{l.phase}] {l.message}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </div>
  );
}

function Meta({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-xs text-slate-400">{label}:</span>
      <span className={cn("font-medium text-slate-800", mono && "font-mono")}>{value}</span>
    </span>
  );
}

function PhaseCard({
  phase,
  status,
  onRefresh,
}: {
  phase: PhaseKey;
  status: PhaseStatus;
  onRefresh: () => void;
}) {
  const meta = PHASE_META[phase];
  return (
    <Card className={cn("flex-1", status === "running" && "border-amber-300")}>
      <CardBody>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-slate-800">{meta.title}</p>
            <p className="mt-0.5 text-xs text-slate-500">{meta.desc}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {phaseIcon(status)}
            <StatusBadge status={status} />
            <button
              type="button"
              onClick={onRefresh}
              className="text-[11px] text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              làm mới
            </button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

/* ---------------- PHA 1: Construction ---------------- */

function ConstructionSection({
  status,
  data,
  error,
}: {
  status: PhaseStatus;
  data: { steps: ConstructionStep[] } | null;
  error: string | null;
}) {
  const [selectedTid, setSelectedTid] = useState<number | null>(null);
  const step = data?.steps.find((s) => s.tid === selectedTid) ?? data?.steps[0] ?? null;

  if (status === "pending")
    return <PhaseSection title="Pha 1 · Construction" status={status} />;
  if (error)
    return (
      <PhaseSection title="Pha 1 · Construction" status="error">
        <ErrorState message={error} />
      </PhaseSection>
    );
  if (!data || data.steps.length === 0)
    return (
      <PhaseSection title="Pha 1 · Construction" status={status}>
        <EmptyState title="Chưa có dữ liệu Construction" />
      </PhaseSection>
    );

  return (
    <PhaseSection title="Pha 1 · Construction" status={status}>
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <div>
          <p className="mb-1.5 text-xs font-semibold text-slate-500">Giao dịch đang xử lý</p>
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {data.steps.map((s) => (
              <li key={s.tid}>
                <button
                  type="button"
                  onClick={() => setSelectedTid(s.tid)}
                  className={cn(
                    "w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                    step?.tid === s.tid
                      ? "bg-blue-50 font-semibold text-blue-700"
                      : "text-slate-600 hover:bg-slate-50",
                  )}
                >
                  T{s.tid}
                  <span className="ml-2 text-xs text-slate-400">{s.items.length} mục</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {step && (
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-800">
              Giao dịch T{step.tid} — các mục được duyệt
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                    <th className="py-2">Mục</th>
                    <th className="py-2 text-right">
                      <ColumnHeader
                        label="u"
                        tooltip={{
                          description: "Tiện ích của mục trong giao dịch này.",
                        }}
                      />
                    </th>
                    <th className="py-2 text-right">
                      <ColumnHeader
                        label="inv"
                        tooltip={{
                          description: "Chi phí đầu tư đơn vị của mục (từ investmentTable).",
                        }}
                      />
                    </th>
                    <th className="py-2 text-right">
                      <ColumnHeader
                        label="ae (thô)"
                        tooltip={{
                          formula: "ae = u / inv",
                          description:
                            "Hiệu suất trung bình THÔ — CHƯA nhân hệ số suy giảm (áp dụng ở pha Restructure).",
                        }}
                      />
                    </th>
                    <th className="py-2 text-right">
                      <ColumnHeader
                        label="MAEUB (thô)"
                        tooltip={{
                          description:
                            "Cận trên hiệu suất trung bình thô, tính bằng chiến lược duyệt tham lam. Chỉ có ở backend cung cấp.",
                        }}
                      />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {step.items.map((it) => (
                    <tr key={it.item} className="border-b border-slate-50 last:border-b-0">
                      <td className="py-2 font-mono font-semibold text-slate-800">{it.item}</td>
                      <td className="py-2 text-right tabular-nums">{it.u}</td>
                      <td className="py-2 text-right tabular-nums">{it.inv}</td>
                      <td className="py-2 text-right font-mono tabular-nums text-blue-700">
                        {fmt(it.aeRaw)}
                      </td>
                      <td className="py-2 text-right font-mono tabular-nums text-slate-500">
                        {it.maeubRaw !== undefined ? fmt(it.maeubRaw) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-100 p-3">
                <p className="text-xs font-semibold text-slate-500">Node DAE-List mới tạo</p>
                {step.newNodes.length === 0 ? (
                  <p className="mt-1 text-xs text-slate-400">Không có node mới.</p>
                ) : (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {step.newNodes.map((n) => (
                      <Badge key={n} variant="blue">
                        {fmtItemset([n])}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-lg border border-slate-100 p-3">
                <p className="text-xs font-semibold text-slate-500">Entry vừa thêm</p>
                <ul className="mt-1.5 space-y-1 text-xs text-slate-600">
                  {step.entriesAdded.map((e, i) => (
                    <li key={i} className="font-mono">
                      {fmtItemset(e.itemset)} ← tid={e.tid}, u={e.u}, ae={fmt(e.aeRaw)}
                      {e.maeubRaw !== undefined && `, MAEUB=${fmt(e.maeubRaw)}`}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </PhaseSection>
  );
}

/* ---------------- PHA 2: Restructure ---------------- */

function RestructureSection({
  status,
  data,
  error,
}: {
  status: PhaseStatus;
  data: import("@/lib/types").RestructureTrace | null;
  error: string | null;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<"before" | "after">("after");

  const allNodes = useMemo(
    () => [...(data?.kept ?? []), ...(data?.removed ?? [])],
    [data],
  );
  const node =
    allNodes.find((n) => n.itemset.join(",") === selected) ?? data?.kept[0] ?? null;

  if (status === "pending")
    return <PhaseSection title="Pha 2 · Restructure" status={status} />;
  if (error)
    return (
      <PhaseSection title="Pha 2 · Restructure" status="error">
        <ErrorState message={error} />
      </PhaseSection>
    );
  if (!data)
    return (
      <PhaseSection title="Pha 2 · Restructure" status={status}>
        <EmptyState title="Chưa có dữ liệu Restructure" />
      </PhaseSection>
    );

  const columns: Column<RestructureNode>[] = [
    {
      key: "itemset",
      header: "Itemset",
      render: (n) => (
        <span className="font-mono font-semibold text-slate-800">{fmtItemset(n.itemset)}</span>
      ),
    },
    {
      key: "sdae",
      header: (
        <ColumnHeader
          label="Sdae"
          tooltip={{
            formula: "Sdae = Σ ae(t)·f^(Ltid−tid)",
            description: "Tổng hiệu suất trung bình suy giảm trên toàn luồng.",
          }}
        />
      ),
      align: "right",
      render: (n) => <span className="font-mono">{fmt(n.sdae)}</span>,
    },
    {
      key: "smdaeub",
      header: (
        <ColumnHeader
          label="SMDAEUB"
          tooltip={{
            description: "Tổng cận trên MDAEUB — dùng để lọc ở pha Restructure.",
          }}
        />
      ),
      align: "right",
      render: (n) => <span className="font-mono">{fmt(n.smdaeub)}</span>,
    },
    {
      key: "stdaeub",
      header: (
        <ColumnHeader
          label="STDAEUB"
          tooltip={{
            description: "Tổng cận trên TDAEUB — dùng để cắt tỉa ở pha Expansion.",
          }}
        />
      ),
      align: "right",
      render: (n) => <span className="font-mono">{fmt(n.stdaeub)}</span>,
    },
    {
      key: "kept",
      header: "Kết luận",
      render: (n) =>
        n.kept ? (
          <Badge variant="green">Giữ lại</Badge>
        ) : (
          <Badge variant="red">Loại: {n.removeReason}</Badge>
        ),
    },
  ];

  return (
    <PhaseSection title="Pha 2 · Restructure" status={status}>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>
          Ltid = <strong className="font-mono">{data.ltid}</strong>
        </span>
        <span>
          f = <strong className="font-mono">{fmt(data.f, 2)}</strong>
        </span>
        <span>
          minae = <strong className="font-mono">{fmt(data.minae, 3)}</strong>
        </span>
        <span className="ml-auto inline-flex rounded-lg border border-slate-200 p-0.5">
          <button
            type="button"
            onClick={() => setView("before")}
            className={cn(
              "rounded-md px-2.5 py-1",
              view === "before" ? "bg-slate-800 text-white" : "text-slate-600",
            )}
          >
            Trước Restructure (thô)
          </button>
          <button
            type="button"
            onClick={() => setView("after")}
            className={cn(
              "rounded-md px-2.5 py-1",
              view === "after" ? "bg-slate-800 text-white" : "text-slate-600",
            )}
          >
            Sau Restructure
          </button>
        </span>
      </div>

      {view === "before" ? (
        <BeforeAfterTable nodes={allNodes} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-1.5 text-xs font-semibold text-slate-500">
              Ứng viên sau lọc &amp; sắp xếp (tăng dần SMDAEUB)
            </p>
            <DataTable
              columns={columns}
              rows={data.kept}
              rowKey={(n) => n.itemset.join(",")}
              onRowClick={(n) => setSelected(n.itemset.join(","))}
              dense
              emptyMessage="Không còn ứng viên nào."
            />
            {data.removed.length > 0 && (
              <>
                <p className="mb-1.5 mt-4 text-xs font-semibold text-red-600">
                  Bị loại (SMDAEUB &lt; minae)
                </p>
                <DataTable
                  columns={columns}
                  rows={data.removed}
                  rowKey={(n) => n.itemset.join(",")}
                  onRowClick={(n) => setSelected(n.itemset.join(","))}
                  dense
                />
              </>
            )}
          </div>

          {node && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-slate-500">
                Entry cấp giao dịch của {fmtItemset(node.itemset)} (sau suy giảm)
              </p>
              <EntryTable entries={node.entries} />
            </div>
          )}
        </div>
      )}
    </PhaseSection>
  );
}

function BeforeAfterTable({ nodes }: { nodes: RestructureNode[] }) {
  const cols: Column<RestructureNode>[] = [
    {
      key: "itemset",
      header: "Itemset",
      render: (n) => <span className="font-mono font-semibold">{fmtItemset(n.itemset)}</span>,
    },
    {
      key: "ae",
      header: "Σ ae (thô)",
      align: "right",
      render: (n) => (
        <span className="font-mono">{fmt(n.entries.reduce((s, e) => s + e.aeRaw, 0))}</span>
      ),
    },
    {
      key: "sdae",
      header: "Sdae (sau suy giảm)",
      align: "right",
      render: (n) => <span className="font-mono text-blue-700">{fmt(n.sdae)}</span>,
    },
    {
      key: "smdaeub",
      header: "SMDAEUB",
      align: "right",
      render: (n) => <span className="font-mono">{fmt(n.smdaeub)}</span>,
    },
  ];
  return (
    <div>
      <p className="mb-1.5 text-xs text-slate-500">
        So sánh trước/sau Restructure: cột trái là tổng ae thô (Construction), cột phải là Sdae
        sau khi áp hệ số suy giảm.
      </p>
      <DataTable columns={cols} rows={nodes} rowKey={(n) => n.itemset.join(",")} dense />
    </div>
  );
}

function EntryTable({ entries }: { entries: RestructureEntry[] }) {
  const cols: Column<RestructureEntry>[] = [
    { key: "tid", header: "tid", render: (e) => <span className="font-mono">T{e.tid}</span> },
    { key: "u", header: "u", align: "right", render: (e) => e.u },
    {
      key: "weight",
      header: (
        <ColumnHeader
          label="f^(Ltid−tid)"
          tooltip={{
            description: "Trọng số suy giảm theo tuổi giao dịch.",
          }}
        />
      ),
      align: "right",
      render: (e) => <span className="font-mono">{fmt(e.weight)}</span>,
    },
    {
      key: "ae",
      header: "ae thô",
      align: "right",
      render: (e) => <span className="font-mono text-slate-500">{fmt(e.aeRaw)}</span>,
    },
    {
      key: "dae",
      header: "dae",
      align: "right",
      render: (e) => <span className="font-mono text-blue-700">{fmt(e.dae)}</span>,
    },
    {
      key: "mdaeub",
      header: "MDAEUB",
      align: "right",
      render: (e) => <span className="font-mono">{e.mdaeub !== undefined ? fmt(e.mdaeub) : "—"}</span>,
    },
  ];
  return <DataTable columns={cols} rows={entries} rowKey={(e) => e.tid} dense />;
}

/* ---------------- PHA 3: Expansion ---------------- */

function ExpansionSection({
  status,
  data,
  error,
  demoMode,
}: {
  status: PhaseStatus;
  data: import("@/lib/types").ExpansionTrace | null;
  error: string | null;
  demoMode: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const selected = useMemo(() => {
    if (!data || !selectedId) return null;
    const walk = (nodes: ExpansionNode[]): ExpansionNode | null => {
      for (const n of nodes) {
        if (n.id === selectedId) return n;
        const found = walk(n.children);
        if (found) return found;
      }
      return null;
    };
    return walk(data.roots);
  }, [data, selectedId]);

  if (status === "pending")
    return <PhaseSection title="Pha 3 · Expansion" status={status} />;
  if (error)
    return (
      <PhaseSection title="Pha 3 · Expansion" status="error">
        <ErrorState message={error} />
      </PhaseSection>
    );
  if (!data)
    return (
      <PhaseSection title="Pha 3 · Expansion" status={status}>
        <EmptyState title="Chưa có dữ liệu Expansion" />
      </PhaseSection>
    );

  const toggle = (id: string) => {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <PhaseSection title="Pha 3 · Expansion" status={status}>
      <div className="grid gap-4 lg:grid-cols-[minmax(280px,1fr)_1.2fr]">
        <div>
          <p className="mb-1.5 text-xs font-semibold text-slate-500">Cây DFS tập mục</p>
          <div className="rounded-lg border border-slate-100 p-2">
            {data.roots.map((n) => (
              <DfsTreeNode
                key={n.id}
                node={n}
                depth={0}
                selectedId={selectedId}
                expanded={expanded}
                onSelect={setSelectedId}
                onToggle={toggle}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
            <LegendDot color="bg-blue-500" label="đang chọn" />
            <LegendDot color="bg-emerald-500" label="đủ điều kiện HAEI" />
            <LegendDot color="bg-red-400" label="bị cắt tỉa / loại" />
            <LegendDot color="bg-slate-300" label="không mở rộng thêm" />
          </div>
          {demoMode && (
            <p className="mt-2 rounded-lg border border-violet-200 bg-violet-50/60 p-2 text-[11px] text-violet-700">
              Cây DFS phản ánh trace từ tài liệu ví dụ. Khi backend trả về lịch sử mở rộng
              đầy đủ, cây sẽ hiển thị mọi nhánh được sinh ra.
            </p>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold text-slate-500">Chi tiết node</p>
          {!selected ? (
            <EmptyState
              title="Chọn một node trên cây"
              description="Nhấn vào tập mục bất kỳ để xem Sdae, STDAEUB, kết quả ghép và lý do cắt tỉa."
            />
          ) : (
            <NodeDetail node={selected} />
          )}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
        <p className="text-xs font-semibold text-emerald-700">
          Tập kết quả HAEI ({data.results.length})
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {data.results.map((r) => (
            <Badge key={r.join(",")} variant="green">
              {fmtItemset(r)}
            </Badge>
          ))}
        </div>
      </div>
    </PhaseSection>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("size-2.5 rounded-full", color)} />
      {label}
    </span>
  );
}

function DfsTreeNode({
  node,
  depth,
  selectedId,
  expanded,
  onSelect,
  onToggle,
}: {
  node: ExpansionNode;
  depth: number;
  selectedId: string | null;
  expanded: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id) || selectedId === node.id;
  const isSelected = selectedId === node.id;

  return (
    <div style={{ marginLeft: depth * 14 }}>
      <div
        className={cn(
          "flex items-center gap-1 rounded-lg px-2 py-1.5 transition-colors",
          isSelected ? "bg-blue-50 ring-1 ring-blue-300" : "hover:bg-slate-50",
        )}
      >
        {hasChildren ? (
          <button
            type="button"
            aria-label={isOpen ? "Thu gọn" : "Mở rộng"}
            onClick={() => onToggle(node.id)}
            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        ) : (
          <span className="inline-block size-[13px]" />
        )}
        <button
          type="button"
          onClick={() => onSelect(node.id)}
          className={cn(
            "flex items-center gap-1.5 rounded px-1.5 py-0.5 text-left text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
            isSelected ? "text-blue-800" : "text-slate-700",
          )}
        >
          <span
            className={cn(
              "size-2 rounded-full",
              node.isHaei ? "bg-emerald-500" : node.pruneReason ? "bg-red-400" : "bg-slate-300",
            )}
          />
          <span className="font-mono font-semibold">{fmtItemset(node.itemset)}</span>
          {node.sdae !== undefined && (
            <span className="font-mono text-xs text-slate-500">Sdae={fmt(node.sdae)}</span>
          )}
          {node.isHaei && (
            <Badge variant="green" className="px-1.5 py-0">
              HAEI
            </Badge>
          )}
        </button>
      </div>
      {hasChildren && isOpen && (
        <div>
          {node.children.map((c) => (
            <DfsTreeNode
              key={c.id}
              node={c}
              depth={depth + 1}
              selectedId={selectedId}
              expanded={expanded}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NodeDetail({ node }: { node: ExpansionNode }) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-100 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-base font-bold text-slate-800">
            {fmtItemset(node.itemset)}
          </span>
          {node.isHaei ? (
            <Badge variant="green">HAEI — Sdae ≥ minae</Badge>
          ) : (
            <Badge variant="red">Không đạt ngưỡng</Badge>
          )}
          {node.canExpand ? (
            <Badge variant="blue">Còn khả năng mở rộng</Badge>
          ) : (
            <Badge variant="gray">Không mở rộng</Badge>
          )}
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
          <DetailItem label="Sdae" value={fmt(node.sdae)} mono />
          <DetailItem label="STDAEUB" value={fmt(node.stdaeub)} mono />
          <DetailItem label="LTDAEUB" value={fmt(node.ltdaeub)} mono />
        </dl>
        {node.pruneReason && (
          <p className="mt-2 rounded-md bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
            Lý do: {node.pruneReason}
          </p>
        )}
      </div>

      {node.merge && (
        <div className="rounded-lg border border-slate-100 p-3">
          <p className="text-xs font-semibold text-slate-500">Kết quả ghép DAE-List</p>
          <p className="mt-1 font-mono text-sm text-slate-700">
            {fmtItemset(node.merge.left)} ∪ {fmtItemset(node.merge.right)}
          </p>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <DetailItem
              label="TID đồng xuất hiện"
              value={node.merge.coOccurTids.map((t) => `T${t}`).join(", ")}
            />
            <DetailItem
              label="u từng giao dịch"
              value={`(${node.merge.utilities.join(", ")})`}
              mono
            />
            <DetailItem label="Sdae" value={fmt(node.merge.sdae)} mono />
            <DetailItem label="STDAEUB" value={fmt(node.merge.stdaeub)} mono />
            <DetailItem label="LTDAEUB" value={fmt(node.merge.ltdaeub)} mono />
          </dl>
        </div>
      )}
    </div>
  );
}

function DetailItem({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[11px] text-slate-400">{label}</dt>
      <dd className={cn("text-slate-800", mono && "font-mono")}>{value}</dd>
    </div>
  );
}

/* ---------------- Section wrapper ---------------- */

function PhaseSection({
  title,
  status,
  children,
}: {
  title: string;
  status: PhaseStatus;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        <StatusBadge status={status} />
      </div>
      <div className="p-4">{children ?? null}</div>
    </Card>
  );
}
