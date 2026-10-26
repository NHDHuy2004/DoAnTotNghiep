"use client";

import { DemoBanner, PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button, Input, Select } from "@/components/ui/Controls";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { MetricTooltip } from "@/components/ui/MetricTooltip";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { InlineAlert, useToast } from "@/components/ui/Toast";
import { useApp } from "@/lib/context/AppContext";
import { resetConfig, saveConfig, validateConfig } from "@/lib/services/configService";
import { startExecution } from "@/lib/services/algorithmService";
import { pushDemoHistory } from "@/lib/services/executionHistoryService";
import type { AlgorithmConfig, ItemCost } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Play, RotateCcw, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Cấu hình thuật toán — tham số bắt buộc (f, minae) tách khỏi phần tùy chọn
 * (runMode), bảng chi phí có validate từng dòng. Chạy thuật toán là hành động
 * chính, được làm nổi bật ở cuối trang.
 */
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
    demoMode,
  } = useApp();
  const router = useRouter();
  const toast = useToast();

  const [draft, setDraft] = useState<AlgorithmConfig | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [showFieldErrors, setShowFieldErrors] = useState(false);
  const [nameConflict, setNameConflict] = useState<string | null>(null);
  const [confirmRun, setConfirmRun] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [running, setRunning] = useState(false);

  // Khởi tạo bản nháp từ cấu hình vừa tải (điều chỉnh state ngay trong render).
  if (config !== null && draft === null) {
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
          // unitCostTable là tùy chọn theo hợp đồng API
          cu: draft.unitCostTable?.[item] ?? 0,
          inv: draft.investmentTable[item],
        }))
    : [];

  /** Lỗi hiển thị ngay tại ô nhập (chỉ hiện sau lần bấm Lưu/Chạy đầu tiên). */
  const fieldError = (field: "f" | "minae" | `inv:${string}`): string | undefined => {
    if (!showFieldErrors || !draft) return undefined;
    if (field === "f") {
      return Number.isFinite(draft.f) && draft.f > 0 && draft.f < 1
        ? undefined
        : "f phải nằm trong khoảng (0; 1).";
    }
    if (field === "minae") {
      return Number.isFinite(draft.minae) && draft.minae >= 0
        ? undefined
        : "minae phải là số không âm.";
    }
    const key = field.slice(4);
    const v = draft.investmentTable[key];
    return Number.isFinite(v) && v > 0 ? undefined : `inv("${key}") phải là số dương.`;
  };

  const updateDraft = (patch: Partial<AlgorithmConfig>) => {
    if (!draft) return;
    setDraft({ ...draft, ...patch });
    setConfigDirty(true);
  };

  const updateItem = (idx: number, patch: Partial<ItemCost>) => {
    if (!draft) return;
    // Đổi tên mục: từ chối khi trùng tên mục khác để không ghi đè mất dữ liệu
    if (patch.item !== undefined) {
      const newName = patch.item.trim();
      const conflict = items.some((it, i) => i !== idx && it.item === newName);
      // Không có ngoại lệ cho tên rỗng: hai dòng cùng trống sẽ ghi đè nhau trên khoá ""
      if (conflict) {
        setNameConflict(
          newName
            ? `Mục "${newName}" đã tồn tại — không thể đổi tên thành tên trùng.`
            : "Chỉ được để trống tên một dòng — dòng khác đang trống.",
        );
        return;
      }
      setNameConflict(null);
      patch = { ...patch, item: newName };
    }
    const next = items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    // Xây lại bảng từ danh sách để đổi tên mục không làm mất dữ liệu
    const inv: Record<string, number> = {};
    const cu: Record<string, number> = {};
    for (const it of next) {
      inv[it.item] = it.inv;
      cu[it.item] = it.cu;
    }
    updateDraft({ investmentTable: inv, unitCostTable: cu });
  };

  /** Lỗi tên mục: trống hoặc trùng lặp (chỉ hiện sau khi bấm Lưu/Chạy). */
  const nameError = (idx: number): string | undefined => {
    if (!showFieldErrors) return undefined;
    const cur = items[idx];
    if (!cur || !cur.item.trim()) return "Tên mục không được để trống.";
    const dup = items.filter((it) => it.item === cur.item).length;
    return dup > 1 ? `Mục "${cur.item}" bị trùng lặp.` : undefined;
  };

  const removeItem = (idx: number) => {
    if (!draft) return;
    const target = items[idx];
    const inv = { ...draft.investmentTable };
    const cu = { ...draft.unitCostTable };
    delete inv[target.item];
    delete cu[target.item];
    updateDraft({ investmentTable: inv, unitCostTable: cu });
  };

  const handleSave = async () => {
    if (!draft) return;
    setShowFieldErrors(true);
    const v = validateConfig(draft);
    setErrors(v);
    if (v.length > 0) {
      toast.error("Cấu hình chưa hợp lệ", v[0]);
      return;
    }
    try {
      const res = await saveConfig(draft);
      setConfig(res.data);
      setConfigDirty(false);
      setErrors([]);
      toast.success("Đã lưu cấu hình", "Các tham số sẽ được dùng cho phiên chạy tiếp theo.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErrors([msg]);
      toast.error("Không lưu được cấu hình", msg);
    }
  };

  const handleReset = async () => {
    try {
      const res = await resetConfig();
      setDraft(structuredClone(res.data));
      setConfig(res.data);
      setConfigDirty(false);
      setErrors([]);
      setShowFieldErrors(false);
      toast.success("Đã khôi phục cấu hình mặc định");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErrors([msg]);
      toast.error("Không khôi phục được cấu hình", msg);
    } finally {
      setConfirmReset(false);
    }
  };

  const doRun = async () => {
    if (!draft) return;
    setShowFieldErrors(true);
    const v = validateConfig(draft);
    setErrors(v);
    if (v.length > 0) {
      toast.error("Không thể chạy", v[0]);
      setConfirmRun(false);
      return;
    }
    setRunning(true);
    try {
      // Lưu cấu hình trước khi chạy để phiên dùng đúng tham số hiện tại
      const saved = await saveConfig(draft);
      setConfig(saved.data);
      setConfigDirty(false);
      const session = await startExecution(saved.data);
      pushDemoHistory(session.data);
      setActiveSession(session.data);
      toast.success("Đã khởi tạo phiên thực thi", "Đang chuyển tới trang Thực thi.");
      router.push("/execution");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErrors([msg]);
      toast.error("Không khởi tạo được phiên", msg);
    } finally {
      setRunning(false);
      setConfirmRun(false);
    }
  };

  if (!draft) return null;

  const requiredCount = items.filter((it) => it.inv > 0).length;

  return (
    <div>
      <PageHeader
        title="Cấu hình thuật toán"
        description="Thiết lập tham số HAEIM_Damped trước khi chạy: hệ số suy giảm f, ngưỡng minae và bảng chi phí đầu tư."
        badges={configDirty ? <Badge variant="amber">Chưa lưu thay đổi</Badge> : undefined}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirmReset(true)}>
              <RotateCcw size={15} /> Khôi phục mặc định
            </Button>
            <Button onClick={handleSave}>
              <Save size={15} /> Lưu cấu hình
            </Button>
          </>
        }
      />
      <DemoBanner source={demoMode ? "demo" : null} />

      {errors.length > 0 && (
        <div className="mb-4">
          <InlineAlert kind="error" title="Cấu hình chưa hợp lệ">
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </InlineAlert>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Tham số bắt buộc */}
        <Card>
          <CardHeader
            title="Tham số bắt buộc"
            description="Hai tham số chi phối toàn bộ thuật toán suy giảm."
            icon={<span className="text-[13px] font-bold">f</span>}
            actions={<Badge variant="blue">Bắt buộc</Badge>}
          />
          <CardBody className="space-y-5">
            <div className="flex items-start gap-1.5">
              <div className="w-full max-w-xs">
                <Input
                  label="Hệ số suy giảm f"
                  required
                  type="number"
                  step="0.01"
                  min={0.01}
                  max={0.99}
                  value={Number.isFinite(draft.f) ? draft.f : ""}
                  onChange={(e) =>
                    updateDraft({ f: e.target.value === "" ? Number.NaN : Number(e.target.value) })
                  }
                  error={fieldError("f")}
                  hint={
                    <>
                      0 &lt; f &lt; 1. Gần 1 → nhớ lâu; nhỏ → quên nhanh. Ví dụ trong tài liệu: 0.8
                    </>
                  }
                  name="f"
                />
              </div>
              <MetricTooltip metricKey="f" />
            </div>

            <div className="flex items-start gap-1.5">
              <div className="w-full max-w-xs">
                <Input
                  label="Ngưỡng minae"
                  required
                  type="number"
                  step="0.01"
                  min={0}
                  value={Number.isFinite(draft.minae) ? draft.minae : ""}
                  onChange={(e) =>
                    updateDraft({ minae: e.target.value === "" ? Number.NaN : Number(e.target.value) })
                  }
                  error={fieldError("minae")}
                  hint="Tập mục có Sdae ≥ minae được công nhận là HAEI. Ví dụ trong tài liệu: 0.2"
                  name="minae"
                />
              </div>
              <MetricTooltip metricKey="minae" />
            </div>

            <div className="border-t border-line pt-4">
              <div className="mb-1.5 flex items-center gap-1.5">
                <p className="text-xs font-medium text-ink-2">
                  Chế độ chạy <span className="text-ink-3">(tùy chọn)</span>
                </p>
              </div>
              <Select
                value={draft.runMode}
                onChange={(e) =>
                  updateDraft({ runMode: e.target.value as AlgorithmConfig["runMode"] })
                }
                className="w-full sm:w-72"
                name="runMode"
                aria-describedby="runMode-hint"
              >
                <option value="full">Chạy toàn bộ 3 pha</option>
                <option value="phase">Chạy từng pha</option>
              </Select>
              <p id="runMode-hint" className="mt-1.5 text-[11px] leading-relaxed text-ink-3">
                Chế độ “Chạy từng pha” chỉ hoạt động khi backend hỗ trợ API dừng giữa chừng
                (pause/resume theo hợp đồng API).
              </p>
            </div>
          </CardBody>
        </Card>

        {/* Bảng chi phí đầu tư */}
        <Card>
          <CardHeader
            title="Bảng chi phí đầu tư"
            description={
              <>
                <code className="font-mono">inv(i)</code> — chi phí đầu tư đơn vị ·{" "}
                <code className="font-mono">cu(i)</code> — chi phí đơn vị của từng mục.
              </>
            }
            icon={<span className="text-[13px] font-bold">Σ</span>}
            actions={<Badge variant="gray">{items.length} mục</Badge>}
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-left text-[11px] tracking-wide text-ink-3 uppercase">
                  <th className="px-4 py-2.5 font-semibold">Mục</th>
                  <th className="px-4 py-2.5 text-right font-semibold">cu(i)</th>
                  <th className="px-4 py-2.5 text-right font-semibold">
                    <span className="inline-flex items-center gap-1">
                      inv(i)
                      <MetricTooltip metricKey="inv" />
                    </span>
                  </th>
                  <th className="w-10 px-2 py-2.5">
                    <span className="sr-only">Xóa</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const invError = fieldError(`inv:${it.item}`);
                  return (
                    <tr key={it.item || `row-${idx}`} className="border-b border-line last:border-b-0">
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          aria-label={`Tên mục dòng ${idx + 1}`}
                          aria-invalid={!!nameError(idx) || !it.item.trim()}
                          value={it.item}
                          placeholder="tên mục"
                          onChange={(e) => updateItem(idx, { item: e.target.value })}
                          className={cn(
                            "w-full max-w-36 rounded-md border bg-surface px-2 py-1.5 font-mono text-sm text-ink transition-colors focus:outline-none focus:ring-2",
                            !it.item.trim() && showFieldErrors
                              ? "border-warning focus:border-warning focus:ring-warning/15"
                              : nameError(idx)
                                ? "border-danger focus:border-danger focus:ring-danger/15"
                                : "border-line-2 focus:border-brand focus:ring-brand/15",
                          )}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          aria-label={`cu của mục ${it.item || idx + 1}`}
                          value={Number.isFinite(it.cu) ? it.cu : ""}
                          onChange={(e) =>
                            updateItem(idx, { cu: e.target.value === "" ? Number.NaN : Number(e.target.value) })
                          }
                          className="w-24 rounded-md border border-line-2 bg-surface px-2 py-1.5 text-right text-sm text-ink transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          aria-label={`inv của mục ${it.item || idx + 1}`}
                          aria-invalid={!!invError}
                          value={Number.isFinite(it.inv) ? it.inv : ""}
                          onChange={(e) =>
                            updateItem(idx, { inv: e.target.value === "" ? Number.NaN : Number(e.target.value) })
                          }
                          className={cn(
                            "w-24 rounded-md border bg-surface px-2 py-1.5 text-right text-sm text-ink transition-colors focus:outline-none focus:ring-2",
                            invError
                              ? "border-danger focus:border-danger focus:ring-danger/15"
                              : "border-line-2 focus:border-brand focus:ring-brand/15",
                          )}
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          aria-label={`Xóa mục ${it.item || idx + 1}`}
                          onClick={() => removeItem(idx)}
                          className="rounded-md p-1.5 text-ink-3 transition-colors hover:bg-danger-soft hover:text-danger"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-xs text-ink-3">
                      Bảng còn trống — thuật toán cần ít nhất một mục.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="space-y-2 border-t border-line px-4 py-3">
            {nameConflict && (
              <InlineAlert kind="warning">{nameConflict}</InlineAlert>
            )}
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  // Tên mặc định không trùng bất kỳ mục nào đang có
                  let n = 1;
                  while (items.some((it) => it.item === `m${n}`)) n++;
                  const name = `m${n}`;
                  updateDraft({
                    investmentTable: { ...draft.investmentTable, [name]: 1 },
                    unitCostTable: { ...draft.unitCostTable, [name]: 0 },
                  });
                }}
              >
                + Thêm mục
              </Button>
              <p className="text-[11px] text-ink-3">
                {items.length > 0 && `${requiredCount}/${items.length} mục có inv hợp lệ`}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Chạy thuật toán — hành động chính */}
      <Card className="mt-4 border-brand-line">
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              Bắt đầu phiên thực thi
              {configDirty && <Badge variant="amber">sẽ tự lưu trước khi chạy</Badge>}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-3">
              Lưu cấu hình hiện tại rồi chạy HAEIM_Damped trên luồng giao dịch: Construction →
              Restructure → Expansion.
            </p>
          </div>
          <Button size="lg" onClick={() => setConfirmRun(true)} loading={running} className="shrink-0">
            <Play size={16} />
            {running ? "Đang khởi tạo…" : "Chạy thuật toán"}
          </Button>
        </CardBody>
      </Card>

      <ConfirmDialog
        open={confirmReset}
        title="Khôi phục cấu hình mặc định?"
        message="Mọi tham số hiện tại (f, minae, bảng chi phí) sẽ quay về giá trị mặc định. Hành động này không thể hoàn tác."
        confirmLabel="Khôi phục"
        danger
        onConfirm={handleReset}
        onCancel={() => setConfirmReset(false)}
      />

      <ConfirmDialog
        open={confirmRun}
        title="Bắt đầu phiên thực thi mới?"
        message={
          configDirty
            ? "Cấu hình hiện tại chưa được lưu. Hệ thống sẽ lưu cấu hình rồi bắt đầu phiên mới. Tiếp tục?"
            : "Bắt đầu phiên thực thi mới với cấu hình hiện tại. Phiên trước (nếu có) sẽ bị thay thế."
        }
        confirmLabel="Bắt đầu chạy"
        loading={running}
        onConfirm={doRun}
        onCancel={() => setConfirmRun(false)}
      />
    </div>
  );
}
