/**
 * Lưu trữ Phiên thực thi (execution session) trên trình duyệt cho API mode.
 *
 * Backend FastAPI không có khái niệm session/history/log — mỗi lần gọi
 * `POST /api/mine` là chạy đồng bộ một lần. Service tự lưu tại đây để trang
 * Thực thi / Lịch sử hoạt động được (dữ liệu sống mãi qua reload):
 *
 *   - `haeim.sessions`   : danh sách phiên (mới nhất trước, tối đa 50)
 *   - `haeim.run.<id>`   : payload kết quả POST /api/mine + cấu hình lúc chạy
 *   - `haeim.logs.<id>`  : log của phiên
 *
 * Chế độ DEMO KHÔNG dùng module này (demo giữ dữ liệu trong RAM).
 */
import type { AlgorithmConfig, ExecutionSession, LogEntry } from "@/lib/types";

/** Pattern trong response của `POST /api/mine` (candidates / dhaeis). */
export interface WireMinePattern {
  pattern: string[];
  sdae: number;
  smdaeub: number;
  stdaeub: number;
}

export interface WireMineStats {
  ltid: number;
  transactions: number;
  candidates: number;
  dhaeis: number;
  elapsed_ms: number;
  join_attempts?: number;
  join_success?: number;
  pruned_stdaeub?: number;
}

/** Response `POST /api/mine` — dùng lại làm nguồn trace cho các pha. */
export interface WireMine {
  f: number;
  ltid: number;
  minae: number;
  order: string[];
  candidates: WireMinePattern[];
  dhaeis: WireMinePattern[];
  stats: WireMineStats;
  cached?: boolean;
}

/** Phiên đã chạy: kết quả mine + cấu hình tại thời điểm chạy. */
export interface StoredRun {
  session: ExecutionSession;
  config: AlgorithmConfig;
  mine: WireMine;
}

const SESSIONS_KEY = "haeim.sessions";
const RUN_PREFIX = "haeim.run.";
const LOG_PREFIX = "haeim.logs.";
const MAX_SESSIONS = 50;

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage hết dung lượng / bị chặn → bỏ qua (chỉ mất lịch sử)
  }
}

/* ---- Run (payload mine + cấu hình) ---- */

export function saveRun(run: StoredRun): void {
  write(RUN_PREFIX + run.session.id, run);
}

export function getRun(id: string): StoredRun | null {
  return read<StoredRun>(RUN_PREFIX + id);
}

/* ---- Danh sách phiên ---- */

export function listSessions(): ExecutionSession[] {
  return read<ExecutionSession[]>(SESSIONS_KEY) ?? [];
}

export function saveSession(session: ExecutionSession): void {
  const list = listSessions();
  const idx = list.findIndex((s) => s.id === session.id);
  if (idx >= 0) list[idx] = session;
  else list.unshift(session);
  write(SESSIONS_KEY, list.slice(0, MAX_SESSIONS));
}

export function getSession(id: string): ExecutionSession | null {
  return listSessions().find((s) => s.id === id) ?? null;
}

/** Cập nhật một phần phiên (vd: dừng phiên) — trả về bản mới hoặc null. */
export function updateSession(
  id: string,
  patch: Partial<ExecutionSession>,
): ExecutionSession | null {
  const current = getSession(id);
  if (!current) return null;
  const next: ExecutionSession = { ...current, ...patch };
  saveSession(next);
  return next;
}

/* ---- Log ---- */

export function appendLogs(id: string, entries: LogEntry[]): void {
  const key = LOG_PREFIX + id;
  const existing = read<LogEntry[]>(key) ?? [];
  write(key, [...existing, ...entries]);
}

export function readLogs(id: string): LogEntry[] {
  return read<LogEntry[]>(LOG_PREFIX + id) ?? [];
}
