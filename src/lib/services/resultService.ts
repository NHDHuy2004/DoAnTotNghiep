import { apiGet } from "@/lib/api/client";
import { ENDPOINTS, isDemoMode } from "@/lib/api/endpoints";
import { DEMO_RESULTS } from "@/lib/demo/demoData";
import { fetchDaeNodes } from "@/lib/services/daeListService";
import { ApiError } from "@/lib/types";
import type { HaeiResult, Paginated, ServiceResult } from "@/lib/types";

export interface ResultQuery {
  search?: string;
  size?: number | "all";
  status?: "haei" | "not" | "all";
  sort?: "itemset" | "sdae" | "size";
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

/**
 * Lọc + sắp xếp + phân trang (dùng chung cho demo lẫn API).
 * `status` phân biệt HAEI bằng cờ `isHaei` đã có trên từng hàng.
 */
function applyQuery(q: ResultQuery, source: HaeiResult[]): Paginated<HaeiResult> {
  const search = (q.search ?? "").trim().toLowerCase().replace(/[{}]/g, "");
  let list = source.filter((r) => {
    if (q.size !== "all" && q.size !== undefined && r.size !== q.size) return false;
    if (q.status === "haei" && !r.isHaei) return false;
    if (q.status === "not" && r.isHaei) return false;
    if (!search) return true;
    return r.itemset.join("").includes(search);
  });
  list = [...list].sort((a, b) => {
    let c = 0;
    switch (q.sort) {
      case "sdae":
        c = a.sdae - b.sdae;
        break;
      case "size":
        c = a.size - b.size;
        break;
      case "itemset":
      default:
        c = a.itemset.join("").localeCompare(b.itemset.join(""));
    }
    return q.order === "desc" ? -c : c;
  });
  const page = q.page ?? 1;
  const pageSize = q.pageSize ?? 10;
  const start = (page - 1) * pageSize;
  return {
    items: list.slice(start, start + pageSize),
    total: list.length,
    page,
    pageSize,
  };
}

/**
 * API mode: dựng danh sách kết quả từ DAE-List thật (`GET /api/dae-lists`).
 *
 * - `isHaei` = Sdae ≥ minae (định nghĩa HAEI);
 * - `expandable` = STDAEUB ≥ minae (còn cơ hội mở rộng);
 * - `entryCount` = số entry của node;
 * - minae lấy từ `GET /api/config` (tham số hiệu lực backend).
 */
async function fetchApiResults(signal?: AbortSignal): Promise<HaeiResult[]> {
  const [nodes, cfg] = await Promise.all([
    fetchDaeNodes({ signal }),
    apiGet<{ minae: number }>(ENDPOINTS.config, { signal }),
  ]);
  const minae = cfg.minae;
  return nodes.map((n) => {
    const isHaei = n.sdae >= minae;
    return {
      itemset: n.itemset,
      size: n.itemset.length,
      sdae: n.sdae,
      minae,
      isHaei,
      expandable: n.stdaeub >= minae,
      entryCount: n.entryCount,
    };
  });
}

export async function listResults(
  q: ResultQuery,
  signal?: AbortSignal,
): Promise<ServiceResult<Paginated<HaeiResult>>> {
  if (isDemoMode()) {
    return { source: "demo", data: applyQuery(q, DEMO_RESULTS) };
  }
  const rows = await fetchApiResults(signal);
  return { source: "api", data: applyQuery(q, rows) };
}

export async function getResultDetail(
  itemset: string[],
  signal?: AbortSignal,
): Promise<ServiceResult<HaeiResult>> {
  const key = itemset.join(",");
  if (isDemoMode()) {
    const r = DEMO_RESULTS.find((x) => x.itemset.join(",") === key);
    if (!r) throw new Error(`Không tìm thấy kết quả {${key}} trong dữ liệu demo.`);
    return { source: "demo", data: r };
  }
  const rows = await fetchApiResults(signal);
  const r = rows.find((x) => x.itemset.join(",") === key);
  if (!r) throw new ApiError(`Không tìm thấy kết quả {${key}}.`, 404, ENDPOINTS.results);
  return { source: "api", data: r };
}

function toCsv(rows: HaeiResult[]): string {
  const header = "itemset,size,sdae,minae,isHaei,expandable,entryCount";
  const body = rows.map((r) =>
    [
      `{${r.itemset.join(",")}}`,
      r.size,
      r.sdae,
      r.minae,
      r.isHaei,
      r.expandable,
      r.entryCount,
    ].join(","),
  );
  return [header, ...body].join("\n");
}

/**
 * Tải CSV kết quả.
 *
 * Backend không có endpoint `/results/export` riêng cho hợp đồng này →
 * FE tự dựng CSV từ dữ liệu đã chuẩn hóa (cả demo lẫn API đều client-side).
 */
export async function exportResultsCsv(): Promise<{ filename: string; content: string }> {
  const rows = isDemoMode()
    ? DEMO_RESULTS
    : await fetchApiResults();
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return {
    filename: `haei-results-${stamp}.csv`,
    content: toCsv(rows),
  };
}
