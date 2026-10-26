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
import { ApiError } from "@/lib/types";

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
    // Không bịa phiên giả: không tìm thấy phiên nào → báo lỗi như các service demo khác
    throw new ApiError(`Không tìm thấy phiên thực thi ${id} trong dữ liệu demo.`, 404);
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
    // Dữ liệu demo không có phiên này → lỗi rõ ràng thay vì trả phiên "done" rỗng
    throw new ApiError(`Không tìm thấy phiên thực thi ${id} trong dữ liệu demo.`, 404, ENDPOINTS.execution(id));
  }
  const data = await apiGet<ExecutionSession>(ENDPOINTS.execution(id), { signal });
  return { source: "api", data };
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

/**
 * Dạng theo hợp đồng `GET /executions/{id}/phases/restructure`:
 * `{ ltid, minae, nodes[] }` với cờ `kept` trên từng node (mảng đã sắp xếp
 * tăng dần smdaeub). Backend cũ có thể gửi sẵn `kept`/`removed` + `f`.
 */
interface WireRestructureEntry {
  tid: number;
  u?: number;
  weight?: number;
  aeRaw?: number;
  dae?: number;
  mdaeub?: number;
  maxru?: number;
  minInv?: number;
  k?: number;
  pu?: number;
  tdaeub?: number;
}

interface WireRestructureNode {
  itemset: string[];
  entries?: WireRestructureEntry[];
  sae?: number;
  sdae?: number;
  smdaeub?: number;
  stdaeub?: number;
  kept?: boolean;
  removeReason?: string;
}

interface WireRestructureTrace {
  ltid?: number;
  f?: number;
  minae?: number;
  /** Hợp đồng: một mảng duy nhất, phân biệt bằng cờ `kept`. */
  nodes?: WireRestructureNode[];
  /** Dạng cũ: tách sẵn hai mảng. */
  kept?: WireRestructureNode[];
  removed?: WireRestructureNode[];
}

function normalizeRestructureTrace(wire: WireRestructureTrace): RestructureTrace {
  const toNode = (n: WireRestructureNode, kept: boolean) => ({
    itemset: n.itemset ?? [],
    entries: (n.entries ?? []).map((e) => ({
      tid: e.tid,
      u: e.u,
      weight: e.weight ?? 0,
      aeRaw: e.aeRaw,
      dae: e.dae ?? 0,
      mdaeub: e.mdaeub,
      maxru: e.maxru,
      minInv: e.minInv,
      k: e.k,
      pu: e.pu,
      tdaeub: e.tdaeub,
    })),
    sae: n.sae,
    sdae: n.sdae ?? 0,
    smdaeub: n.smdaeub ?? 0,
    stdaeub: n.stdaeub,
    kept,
    removeReason: n.removeReason,
  });

  // Hợp đồng: tách theo cờ kept (mảng nodes không phân biệt thứ tự với 2 mảng).
  const keptRaw = wire.nodes
    ? wire.nodes.filter((n) => n.kept !== false)
    : (wire.kept ?? []);
  const removedRaw = wire.nodes
    ? wire.nodes.filter((n) => n.kept === false)
    : (wire.removed ?? []);

  return {
    ltid: wire.ltid ?? 0,
    f: wire.f,
    minae: wire.minae ?? 0,
    // Hợp đồng nói mảng nodes đã sắp xếp — tự sắp lại cho chắc.
    kept: keptRaw.map((n) => toNode(n, true)).sort((a, b) => a.smdaeub - b.smdaeub),
    removed: removedRaw.map((n) => toNode(n, false)),
  };
}

export async function getRestructureTrace(
  id: string,
  signal?: AbortSignal,
): Promise<ServiceResult<RestructureTrace>> {
  if (isDemoMode()) return { source: "demo", data: DEMO_RESTRUCTURE };
  const wire = await apiGet<WireRestructureTrace>(
    ENDPOINTS.executionPhase(id, "restructure"),
    { signal },
  );
  return { source: "api", data: normalizeRestructureTrace(wire) };
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

/**
 * Log theo con trỏ (hợp đồng: `GET /executions/{id}/logs?after=<offset>` →
 * `{ entries, nextOffset }`). Giữ buffer + cursor theo id để trang Thực thi
 * poll mỗi 5 giây không phải tải lại toàn bộ log mỗi lần.
 */
const logBuffers = new Map<string, LogEntry[]>();
const logCursors = new Map<string, number>();

export async function getLogs(
  id: string,
  signal?: AbortSignal,
): Promise<ServiceResult<LogEntry[]>> {
  if (isDemoMode()) return { source: "demo", data: [...demoLogs] };

  const after = logCursors.get(id) ?? 0;
  const data = await apiGet<{ entries: LogEntry[]; nextOffset?: number }>(
    `${ENDPOINTS.executionLogs(id)}?after=${after}`,
    { signal },
  );
  const incoming = data.entries ?? [];

  let merged: LogEntry[];
  if (typeof data.nextOffset === "number") {
    // Nối phần mới vào buffer, khử trùng lặp theo seq (backend có thể gửi lại)
    const seen = new Set<number>();
    merged = [...(logBuffers.get(id) ?? []), ...incoming].filter((e) => {
      if (seen.has(e.seq)) return false;
      seen.add(e.seq);
      return true;
    });
    logBuffers.set(id, merged);
    logCursors.set(id, data.nextOffset);
  } else {
    // Backend không hỗ trợ con trỏ → mỗi lần tải là danh sách đầy đủ;
    // xóa cursor để lần poll sau lại lấy từ đầu (after=0).
    merged = incoming;
    logBuffers.set(id, merged);
    logCursors.delete(id);
  }
  return { source: "api", data: merged };
}

/** Xóa phiên demo hiện tại (dùng khi bắt đầu phiên mới). */
export function clearDemoSession(): void {
  demoSession = null;
  demoLogs = [];
}
