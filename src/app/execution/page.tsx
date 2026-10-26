"use client";

import { useAsync } from "@/hooks/useAsync";
import { DemoBanner, PageHeader } from "@/components/shared/PageHeader";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button, Select } from "@/components/ui/Controls";
import { Card, CardBody } from "@/components/ui/Card";
import { Dialog, Drawer } from "@/components/ui/Dialog";
import { ColumnHeader, MetricTooltip } from "@/components/ui/MetricTooltip";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { SegmentedControl } from "@/components/ui/FilterBar";
import { EmptyState, ErrorState, LoadingState, NotReadyState } from "@/components/ui/States";
import { TabPanel, Tabs } from "@/components/ui/Tabs";
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
import { METRICS } from "@/lib/metrics";
import type {
  ConstructionStep,
  ExpansionNode,
  ExpansionTrace,
  LogEntry,
  PhaseKey,
  PhaseStatus,
  RestructureEntry,
  RestructureNode,
  RestructureTrace,
} from "@/lib/types";
import { cn, fmt, fmtItemset } from "@/lib/utils";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  FileText,
  ListFilter,
  Play,
  RefreshCw,
  Square,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

const PHASE_META: Record<PhaseKey, { title: string; short: string; desc: string }> = {
  construction: {
    title: "Construction",
    short: "Tiếp nhận dữ liệu",
    desc: "Ghi entry cấp giao dịch vào DAE-List với giá trị THÔ (ae, MAEUB) — chưa áp dụng hệ số suy giảm.",
  },
  restructure: {
    title: "Restructure",
    short: "Suy giảm & lọc",
    desc: "Áp dụng trọng số f^(Ltid−tid), lọc sớm ứng viên (SMDAEUB < minae), sắp xếp tăng dần và tính TDAEUB.",
  },
  expansion: {
    title: "Expansion",
    short: "DFS & ghép",
    desc: "Duyệt DFS: công nhận HAEI (Sdae ≥ minae), cắt tỉa nhánh STDAEUB < minae, ghép DAE-List để sinh tập mục dài hơn.",
  },
};

const PHASE_ORDER: PhaseKey[] = ["construction", "restructure", "expansion"];

function phaseIcon(status: PhaseStatus) {
  switch (status) {
    case "done":
      return <CheckCircle2 size={16} className="text-success" />;
    case "running":
      return <RefreshCw size={16} className="animate-spin text-warning" />;
    case "error":
      return <XCircle size={16} className="text-danger" />;
    case "stopped":
      return <Square size={16} className="text-ink-3" />;
    default:
      return <Circle size={16} className="text-ink-3/60" />;
  }
}

export default function ExecutionPage() {
  const { activeSession, setActiveSession, config, demoMode } = useApp();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [tab, setTab] = useState<PhaseKey>("construction");

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
  const logs = useAsync((signal) => getLogs(sessionId!, signal), [sessionId], {
    immediate: !!sessionId,
  });

  const refreshAll = () => {
    construction.reload();
    restructure.reload();
    expansion.reload();
    logs.reload();
  };

  // Trong khi phiên đang chạy: tự lấy lại trace/log mới nhất từ backend
  // (không tự tạo tiến trình giả — chỉ tải dữ liệu backend trả về).
  const refreshRef = useRef(refreshAll);
  useEffect(() => {
    refreshRef.current = refreshAll;
  });
  const running = activeSession?.status === "running";
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => refreshRef.current(), 5000);
    return () => window.clearInterval(timer);
  }, [running, sessionId]);

  const handleStart = async () => {
    if (!config) return;
    setStarting(true);
    setStartError(null);
    try {
      const res = await startExecution(config);
      pushDemoHistory(res.data);
      setActiveSession(res.data);
      refreshRef.current();
      setTab("construction");
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

  const statusOf = (phase: PhaseKey): PhaseStatus => activeSession?.phases[phase] ?? "pending";

  return (
    <div>
      <PageHeader
        title="Thực thi thuật toán"
        description="Theo dõi pipeline ba pha Construction → Restructure → Expansion trên luồng giao dịch."
        badges={
          activeSession && (
            <Badge variant={running ? "amber" : activeSession.status === "done" ? "green" : "gray"}>
              {running ? "đang chạy" : activeSession.status === "done" ? "hoàn thành" : "đã dừng"}
            </Badge>
          )
        }
        actions={
          <>
            <Button variant="ghost" onClick={() => setGlossaryOpen(true)}>
              <BookOpen size={15} /> Chú giải chỉ số
            </Button>
            <Button variant="secondary" onClick={() => setLogsOpen(true)}>
              <FileText size={15} /> Xem log
            </Button>
            <Button variant="secondary" onClick={refreshAll} disabled={!sessionId}>
              <RefreshCw size={15} /> Làm mới
            </Button>
            {running ? (
              <Button variant="danger" onClick={handleStop}>
                <Square size={15} /> Dừng phiên
              </Button>
            ) : (
              <Button onClick={handleStart} loading={starting} disabled={!config}>
                <Play size={15} />
                {starting ? "Đang khởi tạo…" : activeSession ? "Chạy lại" : "Bắt đầu thực thi"}
              </Button>
            )}
          </>
        }
      />
      <DemoBanner source={construction.source ?? null} />

      {startError && (
        <div className="mb-4">
          <ErrorState title="Lỗi thực thi" message={startError} onRetry={handleStart} />
        </div>
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
        <div className="space-y-4">
          {/* Pipeline 3 pha — trực quan hóa trạng thái từng bước */}
          <div className="grid gap-3 lg:grid-cols-3">
            {PHASE_ORDER.map((phase, i) => (
              <div key={phase} className="flex items-stretch gap-3">
                <PhaseCard
                  phase={phase}
                  index={i + 1}
                  status={statusOf(phase)}
                  active={tab === phase}
                  onSelect={() => setTab(phase)}
                  onRefresh={
                    phase === "construction"
                      ? construction.reload
                      : phase === "restructure"
                        ? restructure.reload
                        : expansion.reload
                  }
                />
                {i < 2 && (
                  <span aria-hidden className="hidden shrink-0 items-center text-ink-3/50 lg:flex">
                    <ChevronRight size={18} />
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Thông tin phiên */}
          <Card>
            <CardBody className="flex flex-wrap items-center gap-x-6 gap-y-2.5 text-sm">
              <Meta label="Mã phiên" value={activeSession.id} mono />
              <Meta label="Trạng thái" value={<StatusBadge status={activeSession.status} withDot />} />
              <Meta label="Ltid" value={activeSession.ltid} mono />
              <Meta label="Số giao dịch" value={activeSession.transactionCount} />
              <Meta label="f" value={fmt(activeSession.config.f, 2)} mono />
              <Meta label="minae" value={fmt(activeSession.config.minae, 3)} mono />
              {activeSession.haeiCount !== undefined && <Meta label="Số HAEI" value={activeSession.haeiCount} />}
              {activeSession.executionTimeMs !== undefined && (
                <Meta label="Thời gian" value={`${activeSession.executionTimeMs} ms`} mono />
              )}
              {activeSession.error && (
                <span className="text-xs text-danger">Lỗi: {activeSession.error}</span>
              )}
            </CardBody>
          </Card>

          {/* Tabs chi tiết từng pha */}
          <Card>
            <div className="px-4 pt-1 sm:px-5">
              <Tabs
                ariaLabel="Chọn pha cần xem"
                value={tab}
                onChange={(k) => setTab(k as PhaseKey)}
                items={PHASE_ORDER.map((p) => ({
                  key: p,
                  label: `${PHASE_META[p].title}`,
                  icon: phaseIcon(statusOf(p)),
                  badge: (
                    <span className="hidden text-[11px] text-ink-3 sm:inline">
                      {PHASE_META[p].short}
                    </span>
                  ),
                }))}
              />
            </div>

            <CardBody>
              <p className="mb-4 text-xs leading-relaxed text-ink-3">
                {PHASE_META[tab].desc}
              </p>

              {tab === "construction" && (
                <TabPanel tabKey="construction" active>
                  <ConstructionSection
                    status={statusOf("construction")}
                    data={construction.data}
                    loading={construction.loading}
                    error={construction.error}
                  />
                </TabPanel>
              )}
              {tab === "restructure" && (
                <TabPanel tabKey="restructure" active>
                  <RestructureSection
                    status={statusOf("restructure")}
                    data={restructure.data}
                    loading={restructure.loading}
                    error={restructure.error}
                  />
                </TabPanel>
              )}
              {tab === "expansion" && (
                <TabPanel tabKey="expansion" active>
                  <ExpansionSection
                    status={statusOf("expansion")}
                    data={expansion.data}
                    loading={expansion.loading}
                    error={expansion.error}
                    demoMode={demoMode}
                  />
                </TabPanel>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      <LogsDrawer
        open={logsOpen}
        onClose={() => setLogsOpen(false)}
        entries={logs.data}
        loading={logs.loading}
        error={logs.error}
        onRetry={logs.reload}
      />

      <GlossaryDialog open={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
    </div>
  );
}

/* ---------------- Pipeline card ---------------- */

function PhaseCard({
  phase,
  index,
  status,
  active,
  onSelect,
  onRefresh,
}: {
  phase: PhaseKey;
  index: number;
  status: PhaseStatus;
  active: boolean;
  onSelect: () => void;
  onRefresh: () => void;
}) {
  const meta = PHASE_META[phase];
  return (
    <Card
      className={cn(
        "flex-1 transition-colors",
        active && "border-brand-line",
        status === "running" && "border-warning-line",
      )}
    >
      <CardBody className="flex h-full items-start gap-3 p-4">
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={active}
          className="flex min-w-0 flex-1 items-start gap-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
        >
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
              active ? "bg-brand text-white" : "bg-surface-3 text-ink-2",
            )}
          >
            {index}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ink">{meta.title}</span>
              <StatusBadge status={status} />
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-ink-3">{meta.desc}</span>
          </span>
        </button>
        <span className="flex shrink-0 flex-col items-end gap-2">
          {phaseIcon(status)}
          <button
            type="button"
            onClick={onRefresh}
            className="text-[11px] text-brand transition-colors hover:underline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
          >
            làm mới
          </button>
        </span>
      </CardBody>
    </Card>
  );
}

function Meta({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-xs text-ink-3">{label}:</span>
      <span className={cn("text-sm font-medium text-ink", mono && "font-mono")}>{value}</span>
    </span>
  );
}

/* ---------------- PHA 1: Construction ---------------- */

function ConstructionSection({
  status,
  data,
  loading,
  error,
}: {
  status: PhaseStatus;
  data: { steps: ConstructionStep[] } | null;
  loading: boolean;
  error: string | null;
}) {
  const [selectedTid, setSelectedTid] = useState<number | null>(null);
  const step = data?.steps.find((s) => s.tid === selectedTid) ?? data?.steps[0] ?? null;

  if (loading) return <LoadingState label="Đang tải trace Construction…" />;
  if (error) return <ErrorState message={error} />;
  if (status === "pending")
    return (
      <EmptyState
        title="Pha Construction chưa chạy"
        description="Trace sẽ xuất hiện khi phiên thực thi bắt đầu."
      />
    );
  if (!data || data.steps.length === 0)
    return <EmptyState title="Chưa có dữ liệu Construction" />;

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <div>
        <p className="mb-1.5 text-[11px] font-semibold tracking-wider text-ink-3 uppercase">
          Giao dịch ({data.steps.length})
        </p>
        <ul className="max-h-80 space-y-0.5 overflow-y-auto pr-1">
          {data.steps.map((s) => (
            <li key={s.tid}>
              <button
                type="button"
                onClick={() => setSelectedTid(s.tid)}
                aria-current={step?.tid === s.tid}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                  step?.tid === s.tid
                    ? "bg-brand-soft font-semibold text-brand"
                    : "text-ink-2 hover:bg-surface-2",
                )}
              >
                <span className="font-mono">T{s.tid}</span>
                <span className="text-[11px] text-ink-3">{s.items.length} mục</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {step && (
        <div className="min-w-0 space-y-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">
              Giao dịch <span className="font-mono">T{step.tid}</span> — các mục được duyệt
            </p>
            <div className="overflow-hidden rounded-lg border border-line">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-line bg-surface-2 text-left text-[11px] tracking-wide text-ink-3 uppercase">
                      <th className="px-3 py-2.5 font-semibold">Mục</th>
                      <th className="px-3 py-2.5 text-right font-semibold">
                        <ColumnHeader label="u" metricKey="u" />
                      </th>
                      <th className="px-3 py-2.5 text-right font-semibold">
                        <ColumnHeader label="inv" metricKey="inv" />
                      </th>
                      <th className="px-3 py-2.5 text-right font-semibold">
                        <ColumnHeader label="ae (thô)" metricKey="ae" />
                      </th>
                      <th className="px-3 py-2.5 text-right font-semibold">
                        <ColumnHeader label="MAEUB (thô)" metricKey="maeub" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {step.items.map((it) => (
                      <tr key={it.item} className="border-b border-line last:border-b-0">
                        <td className="px-3 py-2.5 font-mono font-semibold text-ink">{it.item}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{it.u}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{it.inv}</td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums text-brand">
                          {fmt(it.aeRaw)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums text-ink-3">
                          {it.maeubRaw !== undefined ? fmt(it.maeubRaw) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-line bg-surface-2/60 p-3">
              <p className="text-[11px] font-semibold tracking-wider text-ink-3 uppercase">
                Node DAE-List mới tạo
              </p>
              {step.newNodes.length === 0 ? (
                <p className="mt-1.5 text-xs text-ink-3">Không có node mới ở giao dịch này.</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-1">
                  {step.newNodes.map((n) => (
                    <Badge key={n} variant="blue">
                      {fmtItemset([n])}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-lg border border-line bg-surface-2/60 p-3">
              <p className="text-[11px] font-semibold tracking-wider text-ink-3 uppercase">
                Entry vừa thêm ({step.entriesAdded.length})
              </p>
              {step.entriesAdded.length === 0 ? (
                <p className="mt-1.5 text-xs text-ink-3">Không có entry mới.</p>
              ) : (
                <ul className="mt-2 space-y-1 text-xs text-ink-2">
                  {step.entriesAdded.map((e, i) => (
                    <li key={i} className="font-mono">
                      {fmtItemset(e.itemset)} ← tid={e.tid}, u={e.u}, ae={fmt(e.aeRaw)}
                      {e.maeubRaw !== undefined && `, MAEUB=${fmt(e.maeubRaw)}`}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- PHA 2: Restructure ---------------- */

function RestructureSection({
  status,
  data,
  loading,
  error,
}: {
  status: PhaseStatus;
  data: RestructureTrace | null;
  loading: boolean;
  error: string | null;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<"before" | "after">("after");

  const allNodes = useMemo(() => [...(data?.kept ?? []), ...(data?.removed ?? [])], [data]);
  const node =
    allNodes.find((n) => n.itemset.join(",") === selected) ?? data?.kept[0] ?? null;

  if (loading) return <LoadingState label="Đang tải trace Restructure…" />;
  if (error) return <ErrorState message={error} />;
  if (status === "pending")
    return (
      <EmptyState
        title="Pha Restructure chưa chạy"
        description="Trace sẽ xuất hiện khi pha này hoàn tất trên backend."
      />
    );
  if (!data) return <EmptyState title="Chưa có dữ liệu Restructure" />;

  const columns: Column<RestructureNode>[] = [
    {
      key: "itemset",
      header: "Itemset",
      render: (n) => <span className="font-mono font-semibold text-ink">{fmtItemset(n.itemset)}</span>,
    },
    {
      key: "sdae",
      header: <ColumnHeader label="Sdae" metricKey="sdae" />,
      align: "right",
      render: (n) => <span className="font-mono">{fmt(n.sdae)}</span>,
    },
    {
      key: "smdaeub",
      header: <ColumnHeader label="SMDAEUB" metricKey="smdaeub" />,
      align: "right",
      render: (n) => <span className="font-mono">{fmt(n.smdaeub)}</span>,
    },
    {
      key: "stdaeub",
      header: <ColumnHeader label="STDAEUB" metricKey="stdaeub" />,
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
          <Badge variant="red" title={n.removeReason}>
            Loại{n.removeReason ? `: ${n.removeReason}` : ""}
          </Badge>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-2">
        <span>
          Ltid = <strong className="font-mono text-ink">{data.ltid}</strong>
        </span>
        {data.f !== undefined && (
          <span>
            f = <strong className="font-mono text-ink">{fmt(data.f, 2)}</strong>
          </span>
        )}
        <span>
          minae = <strong className="font-mono text-ink">{fmt(data.minae, 3)}</strong>
        </span>
        <SegmentedControl
          className="ml-auto"
          ariaLabel="Chế độ xem Restructure"
          value={view}
          onChange={setView}
          options={[
            { value: "before", label: "Trước (ae thô)" },
            { value: "after", label: "Sau suy giảm" },
          ]}
        />
      </div>

      {view === "before" ? (
        <BeforeAfterTable nodes={allNodes} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="min-w-0 space-y-4">
            <div>
              <p className="mb-1.5 text-[11px] font-semibold tracking-wider text-ink-3 uppercase">
                Ứng viên giữ lại ({data.kept.length}) — sắp xếp tăng dần SMDAEUB
              </p>
              <DataTable
                columns={columns}
                rows={data.kept}
                rowKey={(n) => n.itemset.join(",")}
                onRowClick={(n) => setSelected(n.itemset.join(","))}
                dense
                highlightRow={(n) => n.itemset.join(",") === node?.itemset.join(",")}
                emptyMessage="Không còn ứng viên nào."
                caption="Ứng viên sau khi lọc ở pha Restructure"
              />
            </div>
            {data.removed.length > 0 && (
              <div>
                <p className="mb-1.5 text-[11px] font-semibold tracking-wider text-danger uppercase">
                  Bị loại ({data.removed.length}) — SMDAEUB &lt; minae
                </p>
                <DataTable
                  columns={columns}
                  rows={data.removed}
                  rowKey={(n) => n.itemset.join(",")}
                  onRowClick={(n) => setSelected(n.itemset.join(","))}
                  dense
                  caption="Các tập mục bị loại ở pha Restructure"
                />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <p className="mb-1.5 text-[11px] font-semibold tracking-wider text-ink-3 uppercase">
              Entry cấp giao dịch
            </p>
            {node ? (
              <>
                <p className="mb-2 text-xs text-ink-3">
                  Của <span className="font-mono font-semibold text-ink">{fmtItemset(node.itemset)}</span>{" "}
                  sau khi áp hệ số suy giảm.
                </p>
                <EntryTable entries={node.entries} />
              </>
            ) : (
              <EmptyState title="Chọn một tập mục để xem entry" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Σ ae thô cho bảng trước/sau: ưu tiên `sae` backend gửi kèm; nếu không,
 * cộng `aeRaw` — khi bất kỳ entry nào thiếu aeRaw → undefined (hiện "—").
 */
function rawAeSum(n: RestructureNode): number | undefined {
  if (n.sae !== undefined) return n.sae;
  if (n.entries.length === 0) return 0;
  if (!n.entries.every((e) => e.aeRaw !== undefined)) return undefined;
  return n.entries.reduce<number>((s, e) => s + (e.aeRaw ?? 0), 0);
}

function BeforeAfterTable({ nodes }: { nodes: RestructureNode[] }) {
  const cols: Column<RestructureNode>[] = [
    {
      key: "itemset",
      header: "Itemset",
      render: (n) => <span className="font-mono font-semibold text-ink">{fmtItemset(n.itemset)}</span>,
    },
    {
      key: "ae",
      header: <ColumnHeader label="Σ ae (thô)" metricKey="sae" />,
      align: "right",
      render: (n) => <span className="font-mono">{fmt(rawAeSum(n))}</span>,
    },
    {
      key: "sdae",
      header: <ColumnHeader label="Sdae (sau suy giảm)" metricKey="sdae" />,
      align: "right",
      render: (n) => <span className="font-mono text-brand">{fmt(n.sdae)}</span>,
    },
    {
      key: "smdaeub",
      header: <ColumnHeader label="SMDAEUB" metricKey="smdaeub" />,
      align: "right",
      render: (n) => <span className="font-mono">{fmt(n.smdaeub)}</span>,
    },
  ];
  return (
    <div>
      <p className="mb-2 text-xs leading-relaxed text-ink-3">
        So sánh trước/sau Restructure: cột trái là tổng ae thô từ pha Construction, cột phải là
        Sdae sau khi áp hệ số suy giảm f^(Ltid−tid).
      </p>
      <DataTable columns={cols} rows={nodes} rowKey={(n) => n.itemset.join(",")} dense caption="So sánh trước và sau Restructure" />
    </div>
  );
}

function EntryTable({ entries }: { entries: RestructureEntry[] }) {
  const cols: Column<RestructureEntry>[] = [
    { key: "tid", header: "tid", render: (e) => <span className="font-mono">T{e.tid}</span> },
    { key: "u", header: "u", align: "right", render: (e) => e.u ?? "—" },
    {
      key: "weight",
      header: <ColumnHeader label="f^(Ltid−tid)" metricKey="weight" />,
      align: "right",
      render: (e) => <span className="font-mono">{fmt(e.weight)}</span>,
    },
    {
      key: "ae",
      header: <ColumnHeader label="ae thô" metricKey="ae" />,
      align: "right",
      render: (e) => <span className="font-mono text-ink-3">{fmt(e.aeRaw)}</span>,
    },
    {
      key: "dae",
      header: <ColumnHeader label="dae" metricKey="dae" />,
      align: "right",
      render: (e) => <span className="font-mono text-brand">{fmt(e.dae)}</span>,
    },
    {
      key: "mdaeub",
      header: <ColumnHeader label="MDAEUB" metricKey="mdaeub" />,
      align: "right",
      render: (e) => (
        <span className="font-mono">{e.mdaeub !== undefined ? fmt(e.mdaeub) : "—"}</span>
      ),
    },
  ];
  return <DataTable columns={cols} rows={entries} rowKey={(e) => e.tid} dense caption="Entry cấp giao dịch" />;
}

/* ---------------- PHA 3: Expansion ---------------- */

function ExpansionSection({
  status,
  data,
  loading,
  error,
  demoMode,
}: {
  status: PhaseStatus;
  data: ExpansionTrace | null;
  loading: boolean;
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

  if (loading) return <LoadingState label="Đang tải trace Expansion…" />;
  if (error) return <ErrorState message={error} />;
  if (status === "pending")
    return (
      <EmptyState
        title="Pha Expansion chưa chạy"
        description="Cây DFS và kết quả HAEI sẽ xuất hiện khi pha này hoàn tất."
      />
    );
  if (!data) return <EmptyState title="Chưa có dữ liệu Expansion" />;

  const toggle = (id: string) => {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(300px,1fr)_1.2fr]">
        <div className="min-w-0">
          <p className="mb-1.5 text-[11px] font-semibold tracking-wider text-ink-3 uppercase">
            Cây DFS tập mục
          </p>
          <div className="max-h-[480px] overflow-auto rounded-lg border border-line bg-surface-2/50 p-2">
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
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-ink-3">
            <LegendDot color="bg-brand" label="đang chọn" />
            <LegendDot color="bg-success" label="đủ điều kiện HAEI" />
            <LegendDot color="bg-danger" label="bị cắt tỉa / loại" />
            <LegendDot color="bg-slate-400" label="không mở rộng thêm" />
          </div>
          {demoMode && (
            <p className="mt-2 rounded-lg border border-accent-line bg-accent-soft/60 p-2.5 text-[11px] leading-relaxed text-accent">
              Cây DFS phản ánh trace từ tài liệu ví dụ. Khi backend trả về lịch sử mở rộng đầy đủ,
              cây sẽ hiển thị mọi nhánh được sinh ra.
            </p>
          )}
        </div>

        <div className="min-w-0">
          <p className="mb-1.5 text-[11px] font-semibold tracking-wider text-ink-3 uppercase">
            Chi tiết node
          </p>
          {!selected ? (
            <EmptyState
              title="Chọn một node trên cây"
              description="Nhấn vào tập mục bất kỳ để xem Sdae, STDAEUB, LTDAEUB, kết quả ghép và lý do cắt tỉa."
            />
          ) : (
            <NodeDetail node={selected} />
          )}
        </div>
      </div>

      <div className="rounded-lg border border-success-line bg-success-soft/70 p-3.5">
        <p className="text-xs font-semibold text-success">
          Tập kết quả HAEI ({data.results.length})
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {data.results.map((r) => (
            <Badge key={r.join(",")} variant="green">
              {fmtItemset(r)}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
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
          isSelected ? "bg-brand-soft ring-1 ring-brand-line" : "hover:bg-surface",
        )}
      >
        {hasChildren ? (
          <button
            type="button"
            aria-label={isOpen ? "Thu gọn" : "Mở rộng"}
            aria-expanded={isOpen}
            onClick={() => onToggle(node.id)}
            className="rounded p-0.5 text-ink-3 hover:bg-surface-3 hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
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
            "flex min-w-0 flex-wrap items-center gap-1.5 rounded px-1.5 py-0.5 text-left text-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
            isSelected ? "text-brand-2" : "text-ink-2",
          )}
        >
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              node.isHaei ? "bg-success" : node.pruneReason ? "bg-danger" : "bg-slate-400",
            )}
          />
          <span className="font-mono font-semibold">{fmtItemset(node.itemset)}</span>
          {node.sdae !== undefined && (
            <span className="font-mono text-xs text-ink-3">Sdae={fmt(node.sdae)}</span>
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
      <div className="rounded-lg border border-line bg-surface-2/60 p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-base font-bold text-ink">{fmtItemset(node.itemset)}</span>
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
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          <DetailItem label="Sdae" value={fmt(node.sdae)} mono metricKey="sdae" />
          <DetailItem label="STDAEUB" value={fmt(node.stdaeub)} mono metricKey="stdaeub" />
          <DetailItem label="LTDAEUB" value={fmt(node.ltdaeub)} mono metricKey="ltdaeub" />
        </dl>
        {node.pruneReason && (
          <p className="mt-3 rounded-md border border-danger-line bg-danger-soft px-2.5 py-1.5 text-xs text-danger">
            Lý do: {node.pruneReason}
          </p>
        )}
      </div>

      {node.merge && (
        <div className="rounded-lg border border-line p-3.5">
          <p className="text-[11px] font-semibold tracking-wider text-ink-3 uppercase">
            Kết quả ghép DAE-List
          </p>
          <p className="mt-1.5 font-mono text-sm text-ink">
            {fmtItemset(node.merge.left)} ∪ {fmtItemset(node.merge.right)}
          </p>
          <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <DetailItem
              label="TID đồng xuất hiện"
              value={node.merge.coOccurTids.map((t) => `T${t}`).join(", ")}
            />
            <DetailItem
              label="u từng giao dịch"
              value={`(${node.merge.utilities.join(", ")})`}
              mono
            />
            <DetailItem label="Sdae" value={fmt(node.merge.sdae)} mono metricKey="sdae" />
            <DetailItem label="STDAEUB" value={fmt(node.merge.stdaeub)} mono metricKey="stdaeub" />
            <DetailItem label="LTDAEUB" value={fmt(node.merge.ltdaeub)} mono metricKey="ltdaeub" />
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
  metricKey,
}: {
  label: string;
  value: string;
  mono?: boolean;
  metricKey?: Parameters<typeof MetricTooltip>[0]["metricKey"];
}) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-[11px] text-ink-3">
        {label}
        {metricKey && <MetricTooltip metricKey={metricKey} />}
      </dt>
      <dd className={cn("text-ink", mono && "font-mono")}>{value}</dd>
    </div>
  );
}

/* ---------------- Log drawer ---------------- */

function LogsDrawer({
  open,
  onClose,
  entries,
  loading,
  error,
  onRetry,
}: {
  open: boolean;
  onClose: () => void;
  entries: LogEntry[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const [level, setLevel] = useState<"all" | LogEntry["level"]>("all");
  const [phase, setPhase] = useState<"all" | PhaseKey | "system">("all");

  const filtered = (entries ?? []).filter(
    (l) => (level === "all" || l.level === level) && (phase === "all" || l.phase === phase),
  );

  return (
    <Drawer open={open} title="Log thực thi" description="Theo dõi sự kiện của từng pha." onClose={onClose} size="max-w-2xl">
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <Select
          label="Mức độ"
          value={level}
          onChange={(e) => setLevel(e.target.value as typeof level)}
          className="w-36"
          name="log-level"
        >
          <option value="all">Tất cả</option>
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="error">Error</option>
        </Select>
        <Select
          label="Pha"
          value={phase}
          onChange={(e) => setPhase(e.target.value as typeof phase)}
          className="w-44"
          name="log-phase"
        >
          <option value="all">Tất cả pha</option>
          <option value="system">System</option>
          <option value="construction">Construction</option>
          <option value="restructure">Restructure</option>
          <option value="expansion">Expansion</option>
        </Select>
        <span className="ml-auto pb-1 text-xs text-ink-3 tabular-nums">
          {filtered.length} dòng
        </span>
      </div>

      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={onRetry} />}
      {!loading && !error && entries && entries.length === 0 && (
        <EmptyState
          title="Chưa có log"
          description="Log sẽ xuất hiện sau khi một phiên thực thi được khởi tạo."
        />
      )}
      {!loading && !error && filtered.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-line">
          <ul className="max-h-[55vh] divide-y divide-line overflow-y-auto font-mono text-xs">
            {filtered.map((l) => (
              <li key={l.seq} className="flex gap-2.5 px-3 py-2">
                <span className="shrink-0 text-ink-3">#{l.seq}</span>
                <span
                  className={cn(
                    "shrink-0",
                    l.level === "error" && "text-danger",
                    l.level === "warn" && "text-warning",
                    l.level === "info" && "text-ink-3",
                  )}
                >
                  [{l.phase}]
                </span>
                <span className="min-w-0 text-ink-2">{l.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!loading && !error && entries && entries.length > 0 && filtered.length === 0 && (
        <EmptyState title="Không có log khớp bộ lọc" icon={<ListFilter size={22} />} />
      )}
    </Drawer>
  );
}

/* ---------------- Bảng chú giải chỉ số ---------------- */

function GlossaryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog
      open={open}
      title="Chú giải chỉ số & thuật ngữ"
      description="Nguồn duy nhất dùng cho mọi tooltip trong hệ thống (src/lib/metrics.ts)."
      onClose={onClose}
      width="max-w-3xl"
      footer={<Button variant="secondary" onClick={onClose}>Đã hiểu</Button>}
    >
      <dl className="space-y-3">
        {Object.entries(METRICS).map(([key, m]) => (
          <div key={key} className="rounded-lg border border-line p-3">
            <div className="flex flex-wrap items-center gap-2">
              <dt className="text-sm font-semibold text-ink">{m.term}</dt>
              <code className="rounded bg-surface-3 px-1.5 py-0.5 text-[11px] text-ink-3">{key}</code>
            </div>
            {m.formula && (
              <code className="mt-1.5 block rounded bg-slate-900 px-2 py-1.5 text-[11px] break-all text-blue-200">
                {m.formula}
              </code>
            )}
            <dd className="mt-1.5 text-xs leading-relaxed text-ink-2">{m.description}</dd>
          </div>
        ))}
      </dl>
    </Dialog>
  );
}
