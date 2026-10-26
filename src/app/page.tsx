"use client";

import { DemoBanner } from "@/components/shared/PageHeader";
import { Hero, HeroAction } from "@/components/shared/Hero";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Controls";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StatCard, StatInline } from "@/components/ui/StatCard";
import { ChartSkeleton, EmptyState, ErrorState, StatSkeleton } from "@/components/ui/States";
import { useApp } from "@/lib/context/AppContext";
import { useAsync } from "@/hooks/useAsync";
import { DEMO_DASHBOARD } from "@/lib/demo/demoData";
import { listResults } from "@/lib/services/resultService";
import { listTransactions } from "@/lib/services/transactionService";
import { fmt, fmtItemset } from "@/lib/utils";
import {
  Activity,
  ArrowRight,
  Blocks,
  Database,
  Hash,
  Layers,
  ListChecks,
  Maximize2,
  Percent,
  Shuffle,
  SlidersHorizontal,
  Timer,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Dashboard — số liệu lấy từ services thật (transactionService, resultService).
 * Không tính toán thuật toán trong UI: mọi giá trị đều do service trả về.
 */
export default function DashboardPage() {
  const { config, backendStatus, demoMode: demo, activeSession } = useApp();

  const tx = useAsync((signal) => listTransactions({ page: 1, pageSize: 100 }, signal), []);
  const results = useAsync((signal) => listResults({ page: 1, pageSize: 100 }, signal), []);

  const totalTransactions = tx.data?.total ?? null;
  const totalItems = tx.data
    ? new Set(tx.data.items.flatMap((t) => t.items.map((i) => i.item))).size
    : null;
  const totalItemsets = results.data?.total ?? null;
  const totalHaei = results.data
    ? results.data.items.filter((r) => r.isHaei).length
    : null;

  // Dashboard chỉ tải trang đầu (tối đa 100 bản ghi) — nếu ít hơn total thì
  // các số liệu đếm được là theo phạm vi tải về, phải ghi rõ gợi ý.
  const loadedTx = tx.data?.items.length ?? 0;
  const loadedResults = results.data?.items.length ?? 0;
  const txPartial = !!tx.data && loadedTx < tx.data.total;
  const resultsPartial = !!results.data && loadedResults < results.data.total;

  const latestTid = tx.data?.items.length
    ? Math.max(...tx.data.items.map((t) => t.tid))
    : null;

  const minae = config?.minae ?? null;
  const f = config?.f ?? null;

  const loading = tx.loading || results.loading;
  const error = tx.error ?? results.error;

  const txRows = (tx.data?.items ?? []).map((t) => ({
    name: `T${t.tid}`,
    value: t.tu,
  }));

  const sdaeRows = (results.data?.items ?? []).map((r) => ({
    name: fmtItemset(r.itemset),
    value: r.sdae,
    isHaei: r.isHaei,
  }));

  return (
    <div>
      <Hero
        eyebrow={demo ? "Bản demo · dữ liệu minh họa" : "Nền tảng phân tích khai thác tập mục"}
        title="Tổng quan hệ thống HAEIM_Damped"
        highlight="HAEIM_Damped"
        description="Dữ liệu đầu vào, cấu hình hiện hành và kết quả khai thác tập mục HAEI theo mô hình suy giảm — pipeline ba pha Construction → Restructure → Expansion."
        badges={
          config && (
            <Badge variant="blue" title="Ngưỡng hiệu suất trung bình suy giảm tối thiểu">
              minae = {fmt(config.minae, 3)}
            </Badge>
          )
        }
        actions={
          <>
            <HeroAction href="/config" variant="glass">
              <SlidersHorizontal size={15} /> Cấu hình thuật toán
            </HeroAction>
            <HeroAction href="/execution">
              <Activity size={15} /> Thực thi 3 pha
            </HeroAction>
          </>
        }
        steps={[
          {
            label: "Construction",
            hint: "Xây dựng DAE-List ban đầu",
            icon: Blocks,
            state: activeSession?.status === "done" ? "done" : "idle",
          },
          {
            label: "Restructure",
            hint: "Sắp xếp lại theo suy giảm",
            icon: Shuffle,
            state:
              activeSession?.status === "running"
                ? "active"
                : activeSession?.status === "done"
                  ? "done"
                  : "idle",
          },
          {
            label: "Expansion",
            hint: "Mở rộng tập mục ứng viên",
            icon: Maximize2,
            state: activeSession?.status === "done" ? "done" : "idle",
          },
        ]}
      />
      <DemoBanner source={tx.source ?? null} />

      {backendStatus === "unreachable" && (
        <div className="mb-4 rounded-card border border-danger-line bg-danger-soft px-3.5 py-2.5 text-xs text-danger">
          Backend đang mất kết nối — số liệu trên trang có thể chưa được cập nhật.{" "}
          <Link href="/settings" className="font-semibold underline underline-offset-2">
            Kiểm tra cài đặt kết nối
          </Link>
          .
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          <StatSkeleton count={4} />
          <div className="grid gap-4 lg:grid-cols-2">
            <Card><CardBody><ChartSkeleton /></CardBody></Card>
            <Card><CardBody><ChartSkeleton /></CardBody></Card>
          </div>
        </div>
      )}

      {error && (
        <ErrorState
          title="Không tải được số liệu tổng quan"
          message={error}
          onRetry={() => {
            tx.reload();
            results.reload();
          }}
        />
      )}

      {!loading && !error && (
        <div className="space-y-4">
          {/* Chỉ số chính — phân cấp rõ với hàng thống kê phụ bên dưới */}
          <div className="stagger grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard
              label="Tổng số giao dịch"
              value={totalTransactions ?? "—"}
              icon={<Database size={16} />}
              hint="Luồng dữ liệu đầu vào"
              emphasized
            />
            <StatCard
              label="Tập mục khám phá"
              value={totalItemsets ?? "—"}
              icon={<ListChecks size={16} />}
              hint="Số tập mục đã ghi nhận"
              emphasized
            />
            <StatCard
              label="Tập mục HAEI"
              value={totalHaei ?? "—"}
              accent="green"
              icon={<Trophy size={16} />}
              hint={
                resultsPartial
                  ? `Đạt ngưỡng: Sdae ≥ minae · đếm trong ${loadedResults} tập mục tải về`
                  : "Đạt ngưỡng: Sdae ≥ minae"
              }
              emphasized
            />
            <StatCard
              label="Số mục khác nhau"
              value={totalItems ?? "—"}
              accent="gray"
              icon={<Layers size={16} />}
              hint={
                txPartial
                  ? `Giá trị khác nhau trong ${loadedTx} giao dịch tải về`
                  : "Giá trị xuất hiện trong dữ liệu"
              }
              emphasized
            />
          </div>

          <Card>
            <div className="grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
              <StatInline
                label="Ngưỡng minae"
                value={minae !== null ? fmt(minae, 3) : "—"}
                hint="Hiệu suất TB suy giảm tối thiểu"
              />
              <StatInline
                label="Hệ số suy giảm f"
                value={f !== null ? fmt(f, 2) : "—"}
                hint="Trọng số f^(Ltid − tid)"
              />
              <StatInline
                label="Mã giao dịch mới nhất (Ltid)"
                value={latestTid ?? "—"}
                hint="Giao dịch mới nhất đã nhận"
              />
              <StatInline
                label="Thời gian thực thi"
                value={demo ? `${DEMO_TIME} ms` : "—"}
                hint={demo ? "Theo ví dụ trong tài liệu" : "Chờ backend cung cấp"}
              />
            </div>
          </Card>

          {/* Biểu đồ */}
          <div className="stagger grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Tổng tiện ích giao dịch theo TID"
                description={
                  txPartial
                    ? `TU (Transaction Utility) của ${loadedTx} giao dịch tải về (trang đầu).`
                    : "TU (Transaction Utility) của từng giao dịch đầu vào."
                }
                icon={<Hash size={15} />}
              />
              <CardBody>
                {txRows.length === 0 ? (
                  <EmptyState
                    title="Chưa có giao dịch"
                    description="Thêm giao dịch tại trang Dữ liệu giao dịch để xem biểu đồ."
                    action={
                      <Link href="/transactions">
                        <Button variant="secondary" size="sm">Mở Dữ liệu giao dịch</Button>
                      </Link>
                    }
                  />
                ) : (
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={txRows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                        <defs>
                          <linearGradient id="tuGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#4338ca" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fill: "#77879d" }}
                          tickLine={false}
                          axisLine={{ stroke: "#e6eaf0" }}
                          interval={0}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#77879d" }}
                          tickLine={false}
                          axisLine={false}
                          width={52}
                        />
                        <Tooltip content={<ChartTip unit="TU" />} cursor={{ fill: "#eef4ff" }} />
                        <Bar dataKey="value" name="TU" fill="url(#tuGrad)" radius={[6, 6, 0, 0]} maxBarSize={34} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Phân bố Sdae theo tập mục"
                description={
                  resultsPartial
                    ? `Sdae so với ngưỡng minae — cột xanh là tập mục đạt HAEI; hiển thị ${loadedResults} tập mục tải về (trang đầu).`
                    : "Sdae (hiệu suất TB suy giảm) so với ngưỡng minae — cột xanh là tập mục đạt HAEI."
                }
                icon={<Trophy size={15} />}
                actions={
                  <Link href="/results">
                    <Button variant="ghost" size="sm">
                      Xem kết quả <ArrowRight size={13} />
                    </Button>
                  </Link>
                }
              />
              <CardBody>
                {sdaeRows.length === 0 ? (
                  <EmptyState
                    title="Chưa có kết quả"
                    description="Chưa có tập mục nào được khai thác trong phiên hiện tại."
                  />
                ) : (
                  <>
                    <div className="h-60 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sdaeRows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                          <defs>
                            <linearGradient id="haeiGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#34d399" />
                              <stop offset="100%" stopColor="#047857" />
                            </linearGradient>
                            <linearGradient id="notHaeiGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#cbd5e1" />
                              <stop offset="100%" stopColor="#94a3b8" />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 11, fill: "#77879d", fontFamily: "ui-monospace, monospace" }}
                            tickLine={false}
                            axisLine={{ stroke: "#e6eaf0" }}
                            interval={0}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: "#77879d" }}
                            tickLine={false}
                            axisLine={false}
                            width={52}
                          />
                          <Tooltip content={<ChartTip unit="Sdae" />} cursor={{ fill: "#eef4ff" }} />
                          {minae !== null && (
                            <ReferenceLine
                              y={minae}
                              stroke="#b45309"
                              strokeDasharray="4 3"
                              label={{ value: `minae ${fmt(minae, 3)}`, position: "insideTopRight", fontSize: 10, fill: "#b45309" }}
                            />
                          )}
                          <Bar dataKey="value" name="Sdae" radius={[6, 6, 0, 0]} maxBarSize={40}>
                            {sdaeRows.map((r) => (
                              <Cell
                                key={r.name}
                                fill={r.isHaei ? "url(#haeiGrad)" : "url(#notHaeiGrad)"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-ink-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-2.5 rounded-sm bg-success" /> Đạt HAEI
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-2.5 rounded-sm bg-slate-400" /> Chưa đạt
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-0.5 w-4 bg-warning" /> Ngưỡng minae
                      </span>
                    </div>
                  </>
                )}
              </CardBody>
            </Card>
          </div>

          <div className="stagger grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            {/* Thống kê theo pha — dữ liệu DEMO lấy từ demoData; backend chưa cung cấp */}
            <Card>
              <CardHeader
                title="Thống kê theo ba pha"
                description="Số tập mục vào/ra tại từng pha của pipeline."
                actions={demo ? <Badge variant="purple">DEMO</Badge> : undefined}
              />
              <CardBody className="p-0">
                {demo ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[520px] text-sm">
                        <thead>
                          <tr className="border-b border-line text-left text-[11px] tracking-wide text-ink-3 uppercase">
                            <th className="px-4 py-2.5 font-semibold">Pha</th>
                            <th className="px-4 py-2.5 text-right font-semibold">Vào</th>
                            <th className="px-4 py-2.5 text-right font-semibold">Ra</th>
                            <th className="px-4 py-2.5 font-semibold">Ghi chú</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(
                            [
                              ["Construction", DEMO_DASHBOARD.phaseStats.construction],
                              ["Restructure", DEMO_DASHBOARD.phaseStats.restructure],
                              ["Expansion", DEMO_DASHBOARD.phaseStats.expansion],
                            ] as const
                          ).map(([name, s]) => (
                            <tr key={name} className="border-b border-line last:border-b-0">
                              <td className="px-4 py-3">
                                <span className="font-medium text-ink">{name}</span>
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums">{s.in}</td>
                              <td className="px-4 py-3 text-right tabular-nums">{s.out}</td>
                              <td className="px-4 py-3 text-xs text-ink-3">{s.note}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="border-t border-line px-4 py-2.5 text-[11px] text-ink-3">
                      Số liệu theo ví dụ trong tài liệu — backend sẽ trả về thống kê pha thực tế.
                    </p>
                  </>
                ) : (
                  <EmptyState
                    title="Chưa có thống kê theo pha"
                    description="Backend chưa cung cấp endpoint thống kê số tập mục vào/ra tại từng pha (xem docs/API_CONTRACT.md)."
                  />
                )}
              </CardBody>
            </Card>

            {/* Thao tác tiếp theo */}
            <Card>
              <CardHeader title="Tiếp tục làm việc" description="Các bước thường gặp trong luồng phân tích." />
              <CardBody className="space-y-2 p-3">
                <QuickLink
                  href="/transactions"
                  icon={<Database size={15} />}
                  label="Quản lý dữ liệu giao dịch"
                  hint="Thêm, nhập khẩu, kiểm tra đầu vào"
                />
                <QuickLink
                  href="/config"
                  icon={<Percent size={15} />}
                  label="Cấu hình f và minae"
                  hint="Thiết lập tham số trước khi chạy"
                />
                <QuickLink
                  href="/execution"
                  icon={<Activity size={15} />}
                  label="Xem pipeline 3 pha"
                  hint="Construction → Restructure → Expansion"
                />
                <QuickLink
                  href="/dae-list"
                  icon={<Layers size={15} />}
                  label="Khám phá DAE-List"
                  hint="Cấp cửa sổ và cấp giao dịch"
                />
                <QuickLink
                  href="/history"
                  icon={<Timer size={15} />}
                  label="Lịch sử thực thi"
                  hint="Các phiên đã chạy và cấu hình của chúng"
                />
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

/** Thời gian thực thi ví dụ trong tài liệu (nguồn: demoData). */
const DEMO_TIME = DEMO_DASHBOARD.executionTimeMs;

function QuickLink({
  href,
  icon,
  label,
  hint,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-colors hover:border-line hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand transition-colors group-hover:bg-brand group-hover:text-white">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">{label}</span>
        <span className="block truncate text-[11px] text-ink-3">{hint}</span>
      </span>
      <ArrowRight size={15} className="shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
    </Link>
  );
}

/** Tooltip recharts theo phong cách thiết kế chung. */
function ChartTip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: { payload?: { value: number; isHaei?: boolean }; value?: number | string }[];
  label?: string;
  unit?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0];
  const value = p.value ?? p.payload?.value;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 shadow-pop">
      <p className="text-[11px] font-semibold text-ink">{label}</p>
      <p className="mt-0.5 text-xs text-ink-2 tabular-nums">
        <span className="font-mono font-semibold text-brand">
          {typeof value === "number" ? fmt(value, 4) : String(value ?? "—")}
        </span>{" "}
        <span className="text-ink-3">{unit}</span>
      </p>
    </div>
  );
}
