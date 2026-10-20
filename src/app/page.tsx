"use client";

import { DemoBanner, PageHeader } from "@/components/shared/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { useApp } from "@/lib/context/AppContext";
import { useAsync } from "@/hooks/useAsync";
import { listResults } from "@/lib/services/resultService";
import { listTransactions } from "@/lib/services/transactionService";
import { DEMO_DASHBOARD } from "@/lib/demo/demoData";
import { fmt, fmtItemset } from "@/lib/utils";
import {
  ArrowRight,
  Database,
  Hash,
  Layers,
  ListChecks,
  Percent,
  Timer,
  Trophy,
} from "lucide-react";
import Link from "next/link";

/**
 * Dashboard — dùng dữ liệu thật từ services:
 * - transactions từ transactionService (tổng số giao dịch, mục khác nhau)
 * - results từ resultService (tập mục khám phá, HAEI)
 * - phaseStats chỉ có ở demo mode (backend chưa cung cấp thống kê pha).
 */
export default function DashboardPage() {
  const { config, backendStatus, demoMode: demo } = useApp();

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

  const latestTid = tx.data?.items.length
    ? Math.max(...tx.data.items.map((t) => t.tid))
    : null;

  // Biểu đồ: số giao dịch theo TID (lấy từ transactions thật)
  const txByTid = tx.data?.items ?? [];

  // Biểu đồ: phân bố Sdae của các tập mục (lấy từ results thật)
  const sdaeRows = results.data?.items ?? [];

  const loading = tx.loading || results.loading;
  const error = tx.error ?? results.error;

  return (
    <div>
      <PageHeader
        title="Tổng quan hệ thống"
        description="Cái nhìn nhanh về dữ liệu đầu vào, cấu hình và kết quả khai thác tập mục HAEI theo mô hình suy giảm."
      />
      <DemoBanner source={tx.source ?? null} />

      {loading && <LoadingState label="Đang tải số liệu tổng quan…" />}
      {error && <ErrorState message={error} onRetry={() => { tx.reload(); results.reload(); }} />}

      {!loading && !error && (
        <>
          {/* Thẻ thống kê */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
            <StatCard
              label="Tổng số giao dịch"
              value={totalTransactions ?? "—"}
              icon={<Database size={16} />}
            />
            <StatCard
              label="Số mục khác nhau"
              value={totalItems ?? "—"}
              icon={<Layers size={16} />}
            />
            <StatCard
              label="Tập mục khám phá"
              value={totalItemsets ?? "—"}
              icon={<ListChecks size={16} />}
            />
            <StatCard
              label="Tập mục HAEI"
              value={totalHaei ?? "—"}
              accent="green"
              icon={<Trophy size={16} />}
            />
            <StatCard
              label="Ngưỡng minae"
              value={fmt(config?.minae ?? DEMO_DASHBOARD.minae, 3)}
              accent="amber"
              icon={<Percent size={16} />}
              hint="Hiệu suất TB tối thiểu"
            />
            <StatCard
              label="Hệ số suy giảm f"
              value={fmt(config?.f ?? DEMO_DASHBOARD.f, 2)}
              accent="purple"
              icon={<Percent size={16} />}
              hint="Trọng số f^(Ltid−tid)"
            />
            <StatCard
              label="Mã gd mới nhất Ltid"
              value={latestTid ?? "—"}
              icon={<Hash size={16} />}
            />
            <StatCard
              label="Thời gian thực thi"
              value={
                demo ? `${DEMO_DASHBOARD.executionTimeMs} ms` : "—"
              }
              accent={demo ? "gray" : "blue"}
              icon={<Timer size={16} />}
              hint={demo ? "theo ví dụ trong tài liệu" : "chờ backend cung cấp"}
            />
          </div>

          {/* Biểu đồ */}
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Số giao dịch theo mã TID"
                description="Dữ liệu giao dịch đầu vào — mỗi cột là một giao dịch."
              />
              <CardBody>
                {txByTid.length === 0 ? (
                  <EmptyState title="Chưa có giao dịch" />
                ) : (
                  <BarChartSimple
                    data={txByTid.map((t) => ({
                      label: `T${t.tid}`,
                      value: t.tu,
                    }))}
                    color="#2563eb"
                    valueLabel="TU"
                  />
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Phân bố Sdae của tập mục"
                description={
                  demo
                    ? "Sdae (hiệu suất TB suy giảm) theo tập mục, so với ngưỡng minae."
                    : "Sdae theo tập mục từ backend."
                }
              />
              <CardBody>
                {sdaeRows.length === 0 ? (
                  <EmptyState title="Chưa có kết quả" />
                ) : (
                  <BarChartSimple
                    data={sdaeRows.map((r) => ({
                      label: fmtItemset(r.itemset),
                      value: r.sdae,
                      highlight: r.isHaei,
                    }))}
                    color="#059669"
                    threshold={config?.minae ?? DEMO_DASHBOARD.minae}
                    valueLabel="Sdae"
                  />
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Ứng viên vs HAEI"
                description="So sánh số tập mục khám phá và số tập mục đạt ngưỡng."
              />
              <CardBody>
                <BarChartSimple
                  data={[
                    { label: "Tập mục khám phá", value: totalItemsets ?? 0 },
                    { label: "Tập mục HAEI", value: totalHaei ?? 0 },
                  ]}
                  color="#2563eb"
                />
              </CardBody>
            </Card>

            {demo && (
              <Card>
                <CardHeader
                  title="Thống kê loại theo pha"
                  description="Số tập mục vào/ra tại từng pha (theo ví dụ trong tài liệu)."
                />
                <CardBody>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                        <th className="py-1.5">Pha</th>
                        <th className="py-1.5 text-right">Vào</th>
                        <th className="py-1.5 text-right">Ra</th>
                        <th className="py-1.5">Ghi chú</th>
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
                        <tr key={name} className="border-b border-slate-50 last:border-b-0">
                          <td className="py-2 font-medium text-slate-700">{name}</td>
                          <td className="py-2 text-right tabular-nums">{s.in}</td>
                          <td className="py-2 text-right tabular-nums">{s.out}</td>
                          <td className="py-2 text-xs text-slate-500">{s.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardBody>
              </Card>
            )}
          </div>

          {/* Lối đi nhanh */}
          <div className="mt-4 flex flex-wrap gap-2">
            <QuickLink href="/transactions" label="Quản lý giao dịch" />
            <QuickLink href="/execution" label="Xem pipeline 3 pha" />
            <QuickLink href="/dae-list" label="DAE-List Explorer" />
            <QuickLink href="/results" label="Kết quả HAEI" />
          </div>

          {backendStatus === "unreachable" && (
            <p className="mt-4 text-xs text-red-600">
              Backend đang mất kết nối — số liệu có thể không cập nhật.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm hover:border-blue-300 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      {label}
      <ArrowRight size={12} />
    </Link>
  );
}

/** Biểu đồ cột đơn giản không cần thư viện — dữ liệu nhỏ, dễ đọc. */
function BarChartSimple({
  data,
  color,
  threshold,
  valueLabel,
}: {
  data: { label: string; value: number; highlight?: boolean }[];
  color: string;
  threshold?: number;
  valueLabel?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 0.0001);
  return (
    <div className="space-y-1.5">
      {threshold !== undefined && (
        <p className="text-[11px] text-slate-400">
          Đường ngưỡng minae = {fmt(threshold, 3)}
        </p>
      )}
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2">
          <span className="w-20 shrink-0 truncate text-right font-mono text-[11px] text-slate-500">
            {d.label}
          </span>
          <div className="relative h-4 flex-1 rounded bg-slate-100">
            <div
              className="h-full rounded"
              style={{
                width: `${(d.value / max) * 100}%`,
                backgroundColor: d.highlight === false ? "#f43f5e" : color,
              }}
            />
            {threshold !== undefined && (
              <div
                className="absolute inset-y-0 w-px bg-amber-500"
                style={{ left: `${(threshold / max) * 100}%` }}
                aria-hidden
              />
            )}
          </div>
          <span className="w-16 shrink-0 font-mono text-[11px] tabular-nums text-slate-600">
            {fmt(d.value, 4)}
            {valueLabel && <span className="text-slate-300"> {valueLabel}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}
