"use client";

import { DemoBanner, PageHeader } from "@/components/shared/PageHeader";
import { Button, Input, Select } from "@/components/ui/Controls";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { MetricTooltip } from "@/components/ui/MetricTooltip";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useApp } from "@/lib/context/AppContext";
import { resetConfig, saveConfig, validateConfig } from "@/lib/services/configService";
import { startExecution } from "@/lib/services/algorithmService";
import { pushDemoHistory } from "@/lib/services/executionHistoryService";
import type { AlgorithmConfig, ItemCost } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ConfigPage() {
  const {
    config,
    configLoading,
    configError,
    setConfig,
    configDirty,
    setConfigDirty,
    reloadConfig,
    setActiveSession,
  } = useApp();
  const router = useRouter();

  const [draft, setDraft] = useState<AlgorithmConfig | null>(null);
  const [syncedConfig, setSyncedConfig] = useState<AlgorithmConfig | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [confirmRun, setConfirmRun] = useState(false);
  const [running, setRunning] = useState(false);

  // Khởi tạo bản nháp từ cấu hình vừa tải (điều chỉnh state ngay trong render,
  // chỉ chạy khi config đổi và draft chưa có — không cần effect).
  if (config !== null && config !== syncedConfig && draft === null) {
    setSyncedConfig(config);
    setDraft(structuredClone(config));
  }

  if (configLoading) return <LoadingState label="Đang tải cấu hình…" />;
  if (configError)
    return (
      <ErrorState
        title="Không tải được cấu hình"
        message={configError}
        onRetry={reloadConfig}
      />
    );

  const items: ItemCost[] = draft
    ? Object.keys(draft.investmentTable)
        .sort()
        .map((item) => ({
          item,
          cu: draft.unitCostTable[item] ?? 0,
          inv: draft.investmentTable[item],
        }))
    : [];

  const updateDraft = (patch: Partial<AlgorithmConfig>) => {
    if (!draft) return;
    setDraft({ ...draft, ...patch });
    setConfigDirty(true);
    setSaveMsg(null);
  };

  const updateItem = (idx: number, patch: Partial<ItemCost>) => {
    if (!draft) return;
    const next = items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    updateDraft({
      investmentTable: Object.fromEntries(next.map((it) => [it.item, it.inv])),
      unitCostTable: Object.fromEntries(next.map((it) => [it.item, it.cu])),
    });
  };

  const handleSave = async () => {
    if (!draft) return;
    const v = validateConfig(draft);
    setErrors(v);
    if (v.length > 0) return;
    try {
      const res = await saveConfig(draft);
      setConfig(res.data);
      setConfigDirty(false);
      setSaveMsg("Đã lưu cấu hình.");
    } catch (e) {
      setErrors([e instanceof Error ? e.message : String(e)]);
    }
  };

  const handleReset = async () => {
    try {
      const res = await resetConfig();
      setDraft(structuredClone(res.data));
      setConfig(res.data);
      setConfigDirty(false);
      setErrors([]);
      setSaveMsg("Đã khôi phục cấu hình mặc định.");
    } catch (e) {
      setErrors([e instanceof Error ? e.message : String(e)]);
    }
  };

  const doRun = async () => {
    if (!draft) return;
    setRunning(true);
    setErrors([]);
    try {
      // Lưu cấu hình trước khi chạy để phiên dùng đúng tham số hiện tại
      const saved = await saveConfig(draft);
      setConfig(saved.data);
      setConfigDirty(false);
      const session = await startExecution(saved.data);
      pushDemoHistory(session.data);
      setActiveSession(session.data);
      router.push("/execution");
    } catch (e) {
      setErrors([e instanceof Error ? e.message : String(e)]);
    } finally {
      setRunning(false);
      setConfirmRun(false);
    }
  };

  if (!draft) return null;

  return (
    <div>
      <PageHeader
        title="Cấu hình thuật toán"
        description="Thiết lập tham số HAEIM_Damped trước khi chạy: hệ số suy giảm f, ngưỡng minae, bảng chi phí đầu tư."
        actions={
          <>
            <Button variant="secondary" onClick={handleReset}>
              Khôi phục mặc định
            </Button>
            <Button onClick={handleSave}>Lưu cấu hình</Button>
          </>
        }
      />
      <DemoBanner source="demo" />

      {saveMsg && (
        <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {saveMsg}
        </p>
      )}
      {errors.length > 0 && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <p className="font-semibold">Cấu hình chưa hợp lệ:</p>
          <ul className="mt-1 list-inside list-disc">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Tham số */}
        <Card>
          <CardHeader
            title="Tham số suy giảm & ngưỡng"
            description="Hai tham số chính chi phối toàn bộ thuật toán."
          />
          <CardBody className="space-y-4">
            <div className="flex items-start gap-1.5">
              <Input
                label="Hệ số suy giảm f"
                type="number"
                step="0.01"
                min={0.01}
                max={0.99}
                value={draft.f}
                onChange={(e) => updateDraft({ f: Number(e.target.value) })}
                hint="0 < f < 1. Gần 1 → nhớ lâu; nhỏ → quên nhanh. Ví dụ tài liệu: 0.8"
                name="f"
                className="w-40"
              />
              <MetricTooltip
                term="Hệ số suy giảm f"
                formula="w(t) = f^(Ltid − tid)"
                description="Trọng số suy giảm theo tuổi giao dịch. Giao dịch mới nhất (tid = Ltid) có trọng số 1; giao dịch cũ hơn bị giảm theo lũy thừa của f."
              />
            </div>
            <div className="flex items-start gap-1.5">
              <Input
                label="Ngưỡng minae"
                type="number"
                step="0.01"
                min={0}
                value={draft.minae}
                onChange={(e) => updateDraft({ minae: Number(e.target.value) })}
                hint="Tập mục có Sdae ≥ minae được công nhận là HAEI. Ví dụ tài liệu: 0.2"
                name="minae"
                className="w-40"
              />
              <MetricTooltip
                term="Ngưỡng minae"
                formula="Sdae(P) ≥ minae → HAEI"
                description="Ngưỡng hiệu suất trung bình suy giảm tối thiểu. Dùng để lọc ở pha Restructure (SMDAEUB) và công nhận kết quả ở pha Expansion."
              />
            </div>
            <Select
              label="Chế độ chạy"
              value={draft.runMode}
              onChange={(e) =>
                updateDraft({ runMode: e.target.value as AlgorithmConfig["runMode"] })
              }
              className="w-56"
              name="runMode"
            >
              <option value="full">Chạy toàn bộ 3 pha</option>
              <option value="phase">Chạy từng pha (chờ backend hỗ trợ)</option>
            </Select>
            {draft.runMode === "phase" && (
              <p className="text-xs text-amber-600">
                Chế độ chạy từng pha chỉ hoạt động khi backend hỗ trợ API dừng giữa chừng.
              </p>
            )}
          </CardBody>
        </Card>

        {/* Bảng đầu tư */}
        <Card>
          <CardHeader
            title="Bảng chi phí đầu tư (investmentTable)"
            description="inv(i) — chi phí đầu tư đơn vị của từng mục. cu(i) — chi phí đơn vị."
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[380px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-xs text-slate-500">
                  <th className="px-4 py-2.5">Mục</th>
                  <th className="px-4 py-2.5 text-right">cu(i)</th>
                  <th className="px-4 py-2.5 text-right">inv(i)</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={it.item} className="border-b border-slate-50 last:border-b-0">
                    <td className="px-4 py-2 font-mono font-semibold text-slate-800">
                      {it.item}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <input
                        type="number"
                        aria-label={`cu của mục ${it.item}`}
                        value={it.cu}
                        onChange={(e) => updateItem(idx, { cu: Number(e.target.value) })}
                        className="w-24 rounded border border-slate-200 px-2 py-1 text-right text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <input
                        type="number"
                        aria-label={`inv của mục ${it.item}`}
                        value={it.inv}
                        onChange={(e) => updateItem(idx, { inv: Number(e.target.value) })}
                        className="w-24 rounded border border-slate-200 px-2 py-1 text-right text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 p-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (!draft) return;
                const next = [...items, { item: "", cu: 0, inv: 0 }];
                updateDraft({
                  investmentTable: Object.fromEntries(next.map((it) => [it.item, it.inv])),
                  unitCostTable: Object.fromEntries(next.map((it) => [it.item, it.cu])),
                });
              }}
            >
              + Thêm mục
            </Button>
          </div>
        </Card>
      </div>

      {/* Chạy */}
      <Card className="mt-4">
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">Bắt đầu phiên thực thi</p>
            <p className="text-xs text-slate-500">
              Lưu cấu hình và chạy thuật toán trên luồng giao dịch hiện tại.
              {configDirty && (
                <span className="ml-1 font-medium text-amber-600">
                  (Cấu hình chưa lưu sẽ được lưu tự động.)
                </span>
              )}
            </p>
          </div>
          <Button onClick={() => setConfirmRun(true)} disabled={running}>
            {running ? "Đang khởi tạo…" : "Chạy thuật toán"}
          </Button>
        </CardBody>
      </Card>

      <ConfirmDialog
        open={confirmRun}
        title="Bắt đầu phiên thực thi mới?"
        message={
          configDirty
            ? "Cấu hình hiện tại chưa được lưu. Hệ thống sẽ lưu cấu hình rồi bắt đầu phiên mới. Tiếp tục?"
            : "Bắt đầu phiên thực thi mới với cấu hình hiện tại? Phiên trước (nếu có) sẽ bị thay thế."
        }
        confirmLabel="Bắt đầu chạy"
        onConfirm={doRun}
        onCancel={() => setConfirmRun(false)}
      />
    </div>
  );
}
