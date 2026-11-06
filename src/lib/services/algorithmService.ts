import { apiGet, apiPost, apiPut } from "@/lib/api/client";
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
  ExpansionNode,
  ExpansionTrace,
  ExecutionSession,
  LogEntry,
  Paginated,
  RestructureEntry,
  RestructureNode,
  RestructureTrace,
  ServiceResult,
  Transaction,
} from "@/lib/types";
import { ApiError } from "@/lib/types";
import {
  appendLogs,
  getRun,
  readLogs,
  saveRun,
  saveSession,
  updateSession,
  type WireMine,
} from "@/lib/services/sessionStore";

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

/**
 * API mode: chạy THẬT `POST /api/mine` (Restructure + Expansion đồng bộ),
 * rồi lưu phiên + payload kết quả + log vào `sessionStore` (localStorage)
 * để trang Thực thi / Lịch sử đọc lại được sau reload.
 *
 * Backend không có session/history → toàn bộ trạng thái phiên do FE quản lý.
 */
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

  // 1) Đảm bảo backend chạy đúng cấu hình người dùng đang xem (f/minae/bảng chi phí)
  const saved = await apiPut<WireCfg>(ENDPOINTS.config, {
    f: config.f,
    minae: config.minae,
    investmentTable: config.investmentTable,
    unitCostTable: config.unitCostTable,
    runMode: config.runMode,
  });
  const effective: AlgorithmConfig = {
    f: saved.f,
    minae: saved.minae,
    investmentTable: saved.inv ?? {},
    unitCostTable: saved.cu ?? {},
    runMode: config.runMode,
  };

  // 2) Chạy thật: Restructure + Expansion (đồng bộ, có cache theo tham số)
  const startedAt = new Date().toISOString();
  const mine = await apiPost<WireMine>(ENDPOINTS.mine, {
    f: effective.f,
    minae: effective.minae,
  });

  const session: ExecutionSession = {
    id: `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    status: "done",
    startedAt,
    finishedAt: new Date().toISOString(),
    ltid: mine.ltid,
    transactionCount: mine.stats.transactions,
    config: effective,
    phases: { construction: "done", restructure: "done", expansion: "done" },
    haeiCount: mine.dhaeis.length,
    executionTimeMs: mine.stats.elapsed_ms,
  };

  // 3) Lưu phiên + payload mine + log để các trang đọc lại
  saveRun({ session, config: effective, mine });
  saveSession(session);
  appendLogs(session.id, buildRunLogs(session, mine));

  return { source: "api", data: session };
}

interface WireCfg {
  f: number;
  minae: number;
  inv: Record<string, number>;
  cu: Record<string, number>;
  ltid: number;
}

/** Log tổng hợp từ payload mine (backend không có log riêng). */
function buildRunLogs(session: ExecutionSession, mine: WireMine): LogEntry[] {
  const raw: Array<[LogEntry["level"], LogEntry["phase"], string]> = [
    [
      "info",
      "system",
      `Khởi tạo phiên ${session.id} với f=${session.config.f}, minae=${session.config.minae}.`,
    ],
    [
      "info",
      "construction",
      `Pha 1: ${mine.stats.transactions} giao dịch đã tích lũy trong DAE-List (giá trị thô).`,
    ],
    [
      "info",
      "restructure",
      `Pha 2: áp suy giảm f^(Ltid-tid), lọc ứng viên → ${mine.stats.candidates} DAE-List, sắp xếp tăng dần SMDAEUB.`,
    ],
    [
      "info",
      "expansion",
      `Pha 3: DFS từ ${mine.stats.candidates} gốc, cắt nhánh theo cận trên âm (pruned=${mine.stats.pruned_stdaeub ?? 0}).`,
    ],
  ];
  if (mine.cached) {
    raw.push(["info", "system", "Tham số không đổi — dùng kết quả đã cache (O(1))."]);
  }
  raw.push([
    "info",
    "system",
    `Hoàn thành: ${mine.dhaeis.length} HAEI / ${mine.stats.dhaeis} ứng viên trong ${mine.stats.elapsed_ms} ms.`,
  ]);
  return raw.map(([level, phase, message], i) => ({
    seq: i + 1,
    time: session.startedAt,
    level,
    phase,
    message,
  }));
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
  // POST /api/mine chạy đồng bộ nên phiên API luôn kết thúc ngay — dừng phiên
  // chỉ có ý nghĩa khi người dùng bấm trong lúc còn "đang chạy" (lưu trên FE).
  const updated = updateSession(id, { status: "stopped", finishedAt: new Date().toISOString() });
  if (!updated) throw new ApiError(`Không tìm thấy phiên thực thi ${id}.`, 404);
  appendLogs(id, [
    {
      seq: (readLogs(id).length ?? 0) + 1,
      time: new Date().toISOString(),
      level: "warn",
      phase: "system",
      message: "Phiên thực thi đã bị dừng bởi người dùng.",
    },
  ]);
  return { source: "api", data: updated };
}

export async function getExecution(
  id: string,
  signal?: AbortSignal,
): Promise<ServiceResult<ExecutionSession>> {
  void signal;
  if (isDemoMode()) {
    if (demoSession?.id === id) return { source: "demo", data: demoSession };
    // Dữ liệu demo không có phiên này → lỗi rõ ràng thay vì trả phiên "done" rỗng
    throw new ApiError(`Không tìm thấy phiên thực thi ${id} trong dữ liệu demo.`, 404);
  }
  const session = getSessionById(id);
  return { source: "api", data: session };
}

function getSessionById(id: string): ExecutionSession {
  const run = getRun(id);
  if (run) return run.session;
  throw new ApiError(`Không tìm thấy dữ liệu phiên ${id} (đã xóa localStorage?).`, 404);
}

/* ---------------- Phase traces (API: suy ra từ dữ liệu thật) ---------------- */

/** Lấy payload đã lưu của phiên — nguồn trace cho 3 pha. */
function requireRun(id: string) {
  const run = getRun(id);
  if (!run) {
    throw new ApiError(
      `Không tìm thấy dữ liệu phiên ${id}. Hãy chạy lại phiên thực thi (localStorage có thể đã bị xóa).`,
      404,
    );
  }
  return run;
}

/** Tải toàn bộ giao dịch (phân trang, tối đa 500/trang). */
async function fetchAllTransactions(signal?: AbortSignal): Promise<Transaction[]> {
  const pageSize = 500;
  const first = await apiGet<Paginated<Transaction>>(
    `${ENDPOINTS.transactions}?page=1&pageSize=${pageSize}`,
    { signal },
  );
  const items = [...(first.items ?? [])];
  let page = 1;
  while (items.length < first.total) {
    page += 1;
    const next = await apiGet<Paginated<Transaction>>(
      `${ENDPOINTS.transactions}?page=${page}&pageSize=${pageSize}`,
      { signal },
    );
    if (!next.items?.length) break;
    items.push(...next.items);
  }
  return items;
}

/**
 * Pha 1 Construction — suy từ luồng giao dịch thật + bảng INV lúc chạy.
 *
 * Backend không trả trace từng bước; dựng lại tối giản:
 * mỗi giao dịch = 1 bước, entry `ae = u / Inv` (singleton), node mới = mục
 * xuất hiện lần đầu.
 */
export async function getConstructionTrace(
  id: string,
  signal?: AbortSignal,
): Promise<ServiceResult<ConstructionTrace>> {
  if (isDemoMode()) return { source: "demo", data: DEMO_CONSTRUCTION };
  const { config } = requireRun(id);
  const txs = await fetchAllTransactions(signal);

  const seen = new Set<string>();
  const steps = txs.map((t) => {
    const items = [...t.items].sort((a, b) => a.item.localeCompare(b.item));
    const newNodes: string[] = [];
    const entriesAdded: ConstructionTrace["steps"][number]["entriesAdded"] = [];
    for (const it of items) {
      const inv = config.investmentTable[it.item] ?? 0;
      const aeRaw = inv > 0 ? it.utility / inv : 0;
      if (!seen.has(it.item)) {
        seen.add(it.item);
        newNodes.push(it.item);
      }
      entriesAdded.push({
        itemset: [it.item],
        tid: t.tid,
        u: it.utility,
        aeRaw: round6(aeRaw),
      });
    }
    return {
      tid: t.tid,
      items: items.map((it) => {
        const inv = config.investmentTable[it.item] ?? 0;
        return {
          item: it.item,
          u: it.utility,
          inv,
          aeRaw: round6(inv > 0 ? it.utility / inv : 0),
        };
      }),
      newNodes,
      entriesAdded,
    };
  });
  return { source: "api", data: { steps } };
}

function round6(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}

/** Wire `GET /api/dae-lists` (lấy đủ `sound_bound`/`sound_mode` cho trace). */
interface WireDaeEntry {
  tid: number;
  u: number;
  ae: number;
  dae: number;
  mdaeub: number;
  maxru?: number;
  minInv?: number;
  k?: number;
  tdaeub?: number;
}
interface WireDaeNode {
  pattern: string[];
  sdae: number;
  smdaeub: number;
  stdaeub: number;
  sound_bound?: number;
  entries?: WireDaeEntry[];
}
interface WireDaeLists {
  order: string[];
  nodes: WireDaeNode[];
  sound_mode?: boolean;
}

/**
 * Pha 2 Restructure — từ `GET /api/dae-lists` với đúng (f, minae) của phiên.
 *
 * Giữ node nếu SMDAEUB ≥ minae (hoặc cận trên âm ≥ minae ở chế độ sound)
 * — đúng điều kiện lọc của backend; `weight = f^(Ltid - tid)`.
 */
export async function getRestructureTrace(
  id: string,
  signal?: AbortSignal,
): Promise<ServiceResult<RestructureTrace>> {
  if (isDemoMode()) return { source: "demo", data: DEMO_RESTRUCTURE };
  const { config, mine } = requireRun(id);
  const f = config.f;
  const minae = config.minae;
  const ltid = mine.ltid;

  const wire = await apiGet<WireDaeLists>(
    `${ENDPOINTS.daeList}?f=${f}&minae=${minae}`,
    { signal },
  );

  const toEntry = (e: WireDaeEntry): RestructureEntry => {
    const weight = Math.pow(f, ltid - e.tid);
    return {
      tid: e.tid,
      u: e.u,
      weight,
      // dae = ae × weight → khôi phục ae thô (làm tròn 6 chữ số)
      aeRaw: weight > 0 ? round6(e.dae / weight) : 0,
      dae: e.dae,
      mdaeub: e.mdaeub,
      maxru: e.maxru,
      minInv: e.minInv,
      k: e.k,
      tdaeub: e.tdaeub,
    };
  };
  const toNode = (n: WireDaeNode, kept: boolean): RestructureNode => ({
    itemset: n.pattern ?? [],
    entries: (n.entries ?? []).map(toEntry),
    sdae: n.sdae,
    smdaeub: n.smdaeub,
    stdaeub: n.stdaeub,
    kept,
    removeReason: kept
      ? undefined
      : `SMDAEUB (${n.smdaeub}) < minae (${minae})`,
  });

  const sound = wire.sound_mode !== false;
  const isKept = (n: WireDaeNode) =>
    n.smdaeub >= minae || (sound && (n.sound_bound ?? 0) >= minae);

  const kept = wire.nodes
    .filter(isKept)
    .map((n) => toNode(n, true))
    .sort((a, b) => a.smdaeub - b.smdaeub);
  const removed = wire.nodes.filter((n) => !isKept(n)).map((n) => toNode(n, false));

  return { source: "api", data: { ltid, f, minae, kept, removed } };
}

/**
 * Pha 3 Expansion — từ payload `POST /api/mine` đã lưu (candidates + dhaeis).
 *
 * Backend trả mảng phẳng (không có cây) → dựng cây 2 cấp tối giản:
 * gốc = singleton ứng viên, HAEI dài hơn gắn con theo phần tử đầu.
 */
export async function getExpansionTrace(
  id: string,
  signal?: AbortSignal,
): Promise<ServiceResult<ExpansionTrace>> {
  void signal;
  if (isDemoMode()) return { source: "demo", data: DEMO_EXPANSION };
  const { mine, config } = requireRun(id);
  const minae = config.minae;

  const haeiKeys = new Set(mine.dhaeis.map((d) => d.pattern.join(",")));
  const roots: ExpansionNode[] = mine.candidates.map((c) => {
    const canExpand = c.stdaeub >= minae;
    return {
      id: c.pattern.join(","),
      itemset: c.pattern,
      sdae: c.sdae,
      stdaeub: c.stdaeub,
      isHaei: haeiKeys.has(c.pattern.join(",")),
      canExpand,
      pruneReason: canExpand
        ? undefined
        : `STDAEUB (${c.stdaeub}) < minae (${minae})`,
      children: [],
    };
  });

  // HAEI dài hơn (sinh từ join) — gắn vào gốc theo phần tử đầu của pattern
  for (const d of mine.dhaeis) {
    if (d.pattern.length === 1) continue;
    const node: ExpansionNode = {
      id: d.pattern.join(","),
      itemset: d.pattern,
      sdae: d.sdae,
      stdaeub: d.stdaeub,
      isHaei: true,
      canExpand: false,
      pruneReason: "Đã công nhận HAEI (Sdae ≥ minae) — dừng tại đây.",
      children: [],
    };
    const root = roots.find((r) => r.itemset.length === 1 && r.itemset[0] === d.pattern[0]);
    if (root) root.children.push(node);
    else roots.push(node);
  }

  return {
    source: "api",
    data: { roots, results: mine.dhaeis.map((d) => d.pattern) },
  };
}

/**
 * Log phiên — API mode đọc từ `sessionStore` (tạo lúc `startExecution`).
 */
export async function getLogs(
  id: string,
  signal?: AbortSignal,
): Promise<ServiceResult<LogEntry[]>> {
  void signal;
  if (isDemoMode()) return { source: "demo", data: [...demoLogs] };
  return { source: "api", data: readLogs(id) };
}

/** Xóa phiên demo hiện tại (dùng khi bắt đầu phiên mới). */
export function clearDemoSession(): void {
  demoSession = null;
  demoLogs = [];
}
