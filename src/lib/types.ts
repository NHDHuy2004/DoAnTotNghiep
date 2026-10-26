/**
 * Kiểu dữ liệu nghiệp vụ của hệ thống HAEIM_Damped.
 * Khớp với hợp đồng API trong docs/API_CONTRACT.md.
 */

/* ---------------- Transactions ---------------- */

export interface TransactionItem {
  item: string;
  quantity: number;
  utility: number;
}

export interface Transaction {
  tid: number;
  items: TransactionItem[];
  tu: number;
  processed: boolean;
}

export interface TransactionInput {
  items: TransactionItem[];
}

/* ---------------- Config ---------------- */

export interface ItemCost {
  item: string;
  cu: number;   // chi phí đơn vị
  inv: number;  // chi phí đầu tư đơn vị
}

export interface AlgorithmConfig {
  f: number;                                  // hệ số suy giảm, 0 < f < 1
  minae: number;                              // ngưỡng hiệu suất trung bình tối thiểu
  investmentTable: Record<string, number>;    // inv(i)
  unitCostTable: Record<string, number>;      // cu(i)
  runMode: "full" | "phase";
}

/* ---------------- Execution ---------------- */

export type PhaseKey = "construction" | "restructure" | "expansion";
export type PhaseStatus = "pending" | "running" | "done" | "error" | "stopped";
export type SessionStatus = "running" | "done" | "error" | "stopped";

export interface PhaseStates {
  construction: PhaseStatus;
  restructure: PhaseStatus;
  expansion: PhaseStatus;
}

export interface ExecutionSession {
  id: string;
  status: SessionStatus;
  startedAt: string;
  finishedAt?: string;
  ltid: number;
  transactionCount: number;
  config: AlgorithmConfig;
  phases: PhaseStates;
  haeiCount?: number;
  executionTimeMs?: number;
  error?: string;
}

export interface LogEntry {
  seq: number;
  time: string;
  level: "info" | "warn" | "error";
  phase: PhaseKey | "system";
  message: string;
}

/* ---------------- Construction ---------------- */

export interface ConstructionItemStep {
  item: string;
  u: number;
  inv: number;
  aeRaw: number;      // hiệu suất trung bình THÔ — chưa suy giảm
  maeubRaw?: number;  // cận trên MAEUB thô
}

export interface ConstructionStep {
  tid: number;
  items: ConstructionItemStep[];
  newNodes: string[];
  entriesAdded: {
    itemset: string[];
    tid: number;
    u: number;
    aeRaw: number;
    maeubRaw?: number;
  }[];
}

export interface ConstructionTrace {
  steps: ConstructionStep[];
}

/* ---------------- Restructure ---------------- */

export interface RestructureEntry {
  tid: number;
  /** Utility của giao dịch — hợp đồng không bắt buộc, có thể vắng. */
  u?: number;
  weight: number;   // f^(Ltid - tid)
  /** ae thô từ pha Construction — hợp đồng không gửi, có thể vắng. */
  aeRaw?: number;
  dae: number;      // aeRaw × weight
  mdaeub?: number;
  maxru?: number;
  minInv?: number;
  k?: number;
  pu?: number;
  tdaeub?: number;
}

export interface RestructureNode {
  itemset: string[];
  entries: RestructureEntry[];
  sae?: number;
  sdae: number;
  smdaeub: number;
  stdaeub?: number;
  kept: boolean;
  removeReason?: string;
}

export interface RestructureTrace {
  ltid: number;
  /** Hệ số f (demo/backend cũ) — hợp đồng chỉ gửi weight theo từng entry. */
  f?: number;
  minae: number;
  /** Các node bị loại (SMDAEUB < minae). */
  removed: RestructureNode[];
  /** Các node giữ lại, sắp xếp tăng dần theo SMDAEUB. */
  kept: RestructureNode[];
}

/* ---------------- Expansion ---------------- */

export interface ExpansionMergeInfo {
  left: string[];
  right: string[];
  coOccurTids: number[];
  utilities: number[];
  sdae?: number;
  stdaeub?: number;
  ltdaeub?: number;
}

export interface ExpansionNode {
  id: string;
  itemset: string[];
  sdae?: number;
  stdaeub?: number;
  ltdaeub?: number;
  isHaei: boolean;
  canExpand: boolean;
  pruneReason?: string;
  merge?: ExpansionMergeInfo;
  children: ExpansionNode[];
}

export interface ExpansionTrace {
  roots: ExpansionNode[];
  results: string[][];
}

/* ---------------- DAE-List ---------------- */

export type DaeNodeStatus = "candidate" | "eliminated" | "haei";

export interface DaeListEntry {
  tid: number;
  u: number;
  /**
   * ae (thô) hoặc dae (đã suy giảm) tùy phase.
   * Hợp đồng API dùng tên `dae` — services chuẩn hóa về `value`; thiếu → "—".
   */
  value?: number;
  phase: "construction" | "restructure";
  maxru?: number;
  minInv?: number;
  pu?: number;
  mdaeub?: number;
  k?: number;
  tdaeub?: number;
}

export interface DaeListNode {
  itemset: string[];
  inv: number;
  pi: number;
  sdae: number;
  smdaeub: number;
  stdaeub: number;
  entryCount: number;
  status: DaeNodeStatus;
  entries: DaeListEntry[];
}

/* ---------------- Results ---------------- */

export interface HaeiResult {
  itemset: string[];
  size: number;
  sdae: number;
  minae: number;
  isHaei: boolean;
  expandable: boolean;
  entryCount: number;
  note?: string;
}

/* ---------------- API plumbing ---------------- */

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Gói kết quả service: phân biệt nguồn dữ liệu để UI hiển thị nhãn. */
export interface ServiceResult<T> {
  data: T;
  source: "api" | "demo";
}

export class ApiError extends Error {
  readonly status?: number;
  readonly endpoint?: string;

  constructor(message: string, status?: number, endpoint?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.endpoint = endpoint;
  }
}
