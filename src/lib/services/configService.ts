import { apiGet, apiPost, apiPut } from "@/lib/api/client";
import { ENDPOINTS, isDemoMode } from "@/lib/api/endpoints";
import { DEMO_CONFIG } from "@/lib/demo/demoData";
import type { AlgorithmConfig, ServiceResult } from "@/lib/types";

const STORAGE_KEY = "haeim.config";

/** Validate cấu hình trước khi lưu/chạy. Trả về lỗi cụ thể hoặc null. */
export function validateConfig(cfg: AlgorithmConfig): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(cfg.f) || cfg.f <= 0 || cfg.f >= 1) {
    errors.push("Hệ số suy giảm f phải nằm trong khoảng (0; 1).");
  }
  if (!Number.isFinite(cfg.minae) || cfg.minae < 0) {
    errors.push("Ngưỡng minae phải là số không âm.");
  }
  const items = Object.keys(cfg.investmentTable);
  if (items.length === 0) {
    errors.push("Bảng investmentTable không được để trống.");
  }
  for (const [item, v] of Object.entries(cfg.investmentTable)) {
    if (!item.trim()) {
      errors.push("Tên mục trong investmentTable không được để trống.");
      continue;
    }
    if (!Number.isFinite(v) || v <= 0) {
      errors.push(`inv("${item}") phải là số dương.`);
    }
  }
  for (const [item, v] of Object.entries(cfg.unitCostTable ?? {})) {
    if (!Number.isFinite(v) || v < 0) {
      errors.push(`cu("${item}") phải là số không âm.`);
    }
  }
  return errors;
}

/**
 * Hợp đồng API để `unitCostTable` là tùy chọn — chuẩn hóa về kiểu UI (bắt buộc)
 * để mọi nơi đọc `cfg.unitCostTable[...]` không crash.
 */
function normalizeConfig(cfg: AlgorithmConfig): AlgorithmConfig {
  return {
    ...cfg,
    investmentTable: cfg.investmentTable ?? {},
    unitCostTable: cfg.unitCostTable ?? {},
  };
}

export async function getConfig(signal?: AbortSignal): Promise<ServiceResult<AlgorithmConfig>> {
  if (isDemoMode()) {
    const saved = readLocal();
    return { source: "demo", data: normalizeConfig(saved ?? structuredClone(DEMO_CONFIG)) };
  }
  const data = await apiGet<AlgorithmConfig>(ENDPOINTS.config, { signal });
  return { source: "api", data: normalizeConfig(data) };
}

export async function saveConfig(cfg: AlgorithmConfig): Promise<ServiceResult<AlgorithmConfig>> {
  if (isDemoMode()) {
    const saved = normalizeConfig(cfg);
    writeLocal(saved);
    return { source: "demo", data: saved };
  }
  const data = await apiPut<AlgorithmConfig>(ENDPOINTS.config, cfg);
  return { source: "api", data: normalizeConfig(data) };
}

export async function resetConfig(): Promise<ServiceResult<AlgorithmConfig>> {
  if (isDemoMode()) {
    clearLocal();
    return { source: "demo", data: normalizeConfig(structuredClone(DEMO_CONFIG)) };
  }
  const data = await apiPost<AlgorithmConfig>(ENDPOINTS.configReset);
  return { source: "api", data: normalizeConfig(data) };
}

/* Demo mode: lưu trong localStorage của trình duyệt. */
function readLocal(): AlgorithmConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AlgorithmConfig) : null;
  } catch {
    return null;
  }
}
function writeLocal(cfg: AlgorithmConfig): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}
function clearLocal(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
