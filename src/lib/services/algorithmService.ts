import { apiGet, apiPost } from "@/lib/api/client";
import { ENDPOINTS, isDemoMode } from "@/lib/api/endpoints";
import {
  DEMO_CONFIG,
  DEMO_CONSTRUCTION,
  DEMO_DASHBOARD,
  DEMO_EXPANSION,
  DEMO_RESTRUCTURE,
  DEMO_TRANSACTIONS,
} from "@/lib/demo/demoData";
import type {
  AlgorithmConfig,
  ConstructionTrace,
  ExpansionTrace,
  ExecutionSession,
  LogEntry,
  RestructureTrace,
  ServiceResult,
} from "@/lib/types";

/* ---------------- Session ---------------- */

/**
 * DEMO: mô phỏng một phiên thực thi từ trace ví dụ trong tài liệu.
 * Trạng thái phiên được giữ trong module (in-memory) — không lưu bền vững.
 */
let demoSession: ExecutionSession | null = null;
let demoLogs: LogEntry[] = [];

function log(level: LogEntry["level"], phase: LogEntry["phase"], message: string): void {
  demoLogs.push({
    seq: demoLogs.length + 1,
    time: new Date().toISOString(),
    level,
    phase,
    message,
  });
}

export async function startExecution(
  config: AlgorithmConfig,
): Promise<ServiceResult<ExecutionSession>> {
  if (isDemoMode()) {
    const cfg = { ...DEMO_CONFIG, ...config };
    demoLogs = [];
    log("info", "system", `Khởi tạo phiên thực thi DEMO với f=${cfg.f}, minae=${cfg.minae}.`);
    log("info", "construction", `Xử lý ${DEMO_TRANSACTIONS.length} giao dịch, cập nhật DAE-List (giá trị thô).`);
    log("info", "restructure", `Áp dụng hệ số suy giảm f^(Ltid-tid), lọc SMDAEUB < minae, sắp xếp tăng dần.`);
    log("info", "expansion", `DFS: kiểm tra Sdae ≥ minae, cắt tỉa STDAEUB < minae, ghép DAE-List.`);
    const now = new Date().toISOString();
    demoSession = {
      id: `demo-${Date.now()}`,
      status: "done",
      startedAt: now,
      finishedAt: now,
      ltid: DEMO_TRANSACTIONS.length,
      transactionCount: DEMO_TRANSACTIONS.length,
      config: cfg,
      phases: { construction: "done", restructure: "done", expansion: "done" },
      haeiCount: DEMO_EXPANSION.results.length,
      executionTimeMs: DEMO_DASHBOARD.executionTimeMs,
    };
    return { source: "demo", data: demoSession };
  }
  const data = await apiPost<ExecutionSession>(ENDPOINTS.executions, { config });
  return { source: "api", data };
}

export async function stopExecution(id: string): Promise<ServiceResult<ExecutionSession>> {
  if (isDemoMode()) {
    if (demoSession && demoSession.id === id) {
      demoSession = { ...demoSession, status: "stopped", finishedAt: new Date().toISOString() };
      log("warn", "system", "Phiên thực thi đã bị dừng bởi người dùng.");
      return { source: "demo", data: demoSession };
    }
    return { source: "demo", data: emptySession(id, "stopped") };
  }
  const data = await apiPost<ExecutionSession>(ENDPOINTS.executionStop(id));
  return { source: "api", data };
}

export async function getExecution(
  id: string,
  signal?: AbortSignal,
): Promise<ServiceResult<ExecutionSession>> {
  if (isDemoMode()) {
    if (demoSession?.id === id) return { source: "demo", data: demoSession };
    return { source: "demo", data: emptySession(id, "done") };
  }
  const data = await apiGet<ExecutionSession>(ENDPOINTS.execution(id), { signal });
  return { source: "api", data };
}

function emptySession(id: string, status: ExecutionSession["status"]): ExecutionSession {
  return {
    id,
    status,
    startedAt: new Date().toISOString(),
    ltid: 0,
    transactionCount: 0,
    config: DEMO_CONFIG,
    phases: { construction: "pending", restructure: "pending", expansion: "pending" },
  };
}

/* ---------------- Phase traces ---------------- */

export async function getConstructionTrace(
  id: string,
  signal?: AbortSignal,
): Promise<ServiceResult<ConstructionTrace>> {
  if (isDemoMode()) return { source: "demo", data: DEMO_CONSTRUCTION };
  const data = await apiGet<ConstructionTrace>(ENDPOINTS.executionPhase(id, "construction"), {
    signal,
  });
  return { source: "api", data };
}

export async function getRestructureTrace(
  id: string,
  signal?: AbortSignal,
): Promise<ServiceResult<RestructureTrace>> {
  if (isDemoMode()) return { source: "demo", data: DEMO_RESTRUCTURE };
  const data = await apiGet<RestructureTrace>(ENDPOINTS.executionPhase(id, "restructure"), {
    signal,
  });
  return { source: "api", data };
}

export async function getExpansionTrace(
  id: string,
  signal?: AbortSignal,
): Promise<ServiceResult<ExpansionTrace>> {
  if (isDemoMode()) return { source: "demo", data: DEMO_EXPANSION };
  const data = await apiGet<ExpansionTrace>(ENDPOINTS.executionPhase(id, "expansion"), {
    signal,
  });
  return { source: "api", data };
}

export async function getLogs(
  id: string,
  signal?: AbortSignal,
): Promise<ServiceResult<LogEntry[]>> {
  if (isDemoMode()) return { source: "demo", data: [...demoLogs] };
  const data = await apiGet<{ entries: LogEntry[] }>(`${ENDPOINTS.executionLogs(id)}`, { signal });
  return { source: "api", data: data.entries };
}

/** Xóa phiên demo hiện tại (dùng khi bắt đầu phiên mới). */
export function clearDemoSession(): void {
  demoSession = null;
  demoLogs = [];
}
