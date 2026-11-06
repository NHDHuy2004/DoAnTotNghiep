import { apiGet } from "@/lib/api/client";
import { ENDPOINTS, isDemoMode } from "@/lib/api/endpoints";
import { DEMO_DAE_LIST } from "@/lib/demo/demoData";
import { ApiError } from "@/lib/types";
import type { DaeListEntry, DaeListNode, DaeNodeStatus, ServiceResult } from "@/lib/types";

export interface DaeListQuery {
  search?: string;
  status?: DaeNodeStatus | "all";
  sort?: "itemset" | "inv" | "pi" | "sdae" | "smdaeub" | "stdaeub" | "entries";
  order?: "asc" | "desc";
}

function compare(a: DaeListNode, b: DaeListNode, sort: DaeListQuery["sort"]): number {
  switch (sort) {
    case "inv":
      return a.inv - b.inv;
    case "pi":
      return a.pi - b.pi;
    case "sdae":
      return a.sdae - b.sdae;
    case "smdaeub":
      return a.smdaeub - b.smdaeub;
    case "stdaeub":
      return (a.stdaeub ?? 0) - (b.stdaeub ?? 0);
    case "entries":
      return a.entryCount - b.entryCount;
    case "itemset":
    default:
      return a.itemset.join("").localeCompare(b.itemset.join(""));
  }
}

/* ---------------- API mode: GET /api/dae-lists ---------------- */

/** Response `GET /api/dae-lists` của backend (`app/main.py`). */
interface WireDaeEntry {
  tid: number;
  u: number;
  ae: number;
  dae: number;
  maeub: number;
  mdaeub: number;
  tdaeub: number;
  sound_bound: number;
  maxru?: number;
  minInv?: number;
  k?: number;
}

interface WireDaeNode {
  pattern: string[];
  inv: number;
  pi?: number;
  pu?: number;
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
 * Tải DAE-List từ backend + chuẩn hóa về kiểu UI.
 *
 * - `value` (UI) = `dae` (đã suy giảm) của entry;
 * - `entryCount` = số entry;
 * - `status`: haei nếu Sdae ≥ minae; candidate nếu còn cơ hội
 *   (SMDAEUB hoặc cận âm ≥ minae); ngược lại eliminated;
 * - `f`/`minae` (tùy chọn) để backend đảm bảo Restructure đúng tham số đó.
 *
 * Lọc (search/status) và sắp xếp (sort/order) thực hiện CLIENT-SIDE.
 */
export async function fetchDaeNodes(
  opts: { f?: number; minae?: number; signal?: AbortSignal } = {},
): Promise<DaeListNode[]> {
  const params = new URLSearchParams();
  if (opts.f !== undefined) params.set("f", String(opts.f));
  if (opts.minae !== undefined) params.set("minae", String(opts.minae));
  const qs = params.toString();

  const [wire, cfg] = await Promise.all([
    apiGet<WireDaeLists>(`${ENDPOINTS.daeList}${qs ? `?${qs}` : ""}`, {
      signal: opts.signal,
    }),
    // minae + tập HAEI để phân loại trạng thái node
    apiGet<{ minae: number }>(ENDPOINTS.config, { signal: opts.signal }),
  ]);
  const minae = cfg.minae;

  return (wire.nodes ?? []).map((n) => {
    const entries: DaeListEntry[] = (n.entries ?? []).map((e) => ({
      tid: e.tid,
      u: e.u,
      value: e.dae,
      phase: "restructure",
      maxru: e.maxru,
      minInv: e.minInv,
      mdaeub: e.mdaeub,
      k: e.k,
      tdaeub: e.tdaeub,
    }));
    const isHaei = n.sdae >= minae;
    const alive = n.smdaeub >= minae || (n.sound_bound ?? 0) >= minae;
    const status: DaeNodeStatus = isHaei ? "haei" : alive ? "candidate" : "eliminated";
    return {
      itemset: n.pattern ?? [],
      inv: n.inv,
      pi: n.pi ?? 0,
      sdae: round4(n.sdae),
      smdaeub: round4(n.smdaeub),
      stdaeub: round4(n.stdaeub),
      entryCount: entries.length,
      status,
      entries,
    };
  });
}

function round4(v: number | undefined): number {
  return typeof v === "number" ? Math.round(v * 10000) / 10000 : 0;
}

/** Lọc + sắp xếp client-side (dùng chung cho demo và API). */
function applyQuery(nodes: DaeListNode[], q: DaeListQuery): DaeListNode[] {
  const search = (q.search ?? "").trim().toLowerCase();
  let list = nodes.filter((n) => {
    if (q.status && q.status !== "all" && n.status !== q.status) return false;
    if (!search) return true;
    return n.itemset.join("").includes(search.replace(/[{}]/g, ""));
  });
  list = [...list].sort((a, b) => {
    const c = compare(a, b, q.sort);
    return q.order === "desc" ? -c : c;
  });
  return list;
}

export async function listDaeNodes(
  q: DaeListQuery,
  signal?: AbortSignal,
): Promise<ServiceResult<DaeListNode[]>> {
  if (isDemoMode()) {
    return { source: "demo", data: applyQuery(DEMO_DAE_LIST, q) };
  }
  const nodes = await fetchDaeNodes({ signal });
  return { source: "api", data: applyQuery(nodes, q) };
}

export async function getDaeNode(
  itemset: string[],
  signal?: AbortSignal,
): Promise<ServiceResult<DaeListNode>> {
  const key = itemset.join(",");
  if (isDemoMode()) {
    const node = DEMO_DAE_LIST.find((n) => n.itemset.join(",") === key);
    if (!node) {
      throw new Error(`Không tìm thấy node DAE-List {${key}} trong dữ liệu demo.`);
    }
    return { source: "demo", data: node };
  }
  // Backend không có endpoint 1 node → tải danh sách rồi tìm client-side
  const nodes = await fetchDaeNodes({ signal });
  const node = nodes.find((n) => n.itemset.join(",") === key);
  if (!node) throw new ApiError(`Không tìm thấy node DAE-List {${key}}.`, 404, ENDPOINTS.daeList);
  return { source: "api", data: node };
}

/** Truy nguồn giao dịch của một entry (nhấn entry → xem giao dịch gốc). */
export type { DaeListEntry };
