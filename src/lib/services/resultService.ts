import { apiGet } from "@/lib/api/client";
import { ENDPOINTS, isDemoMode } from "@/lib/api/endpoints";
import { DEMO_RESULTS } from "@/lib/demo/demoData";
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

function filterDemo(q: ResultQuery): HaeiResult[] {
  const search = (q.search ?? "").trim().toLowerCase().replace(/[{}]/g, "");
  let list = DEMO_RESULTS.filter((r) => {
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
  return list;
}

export async function listResults(
  q: ResultQuery,
  signal?: AbortSignal,
): Promise<ServiceResult<Paginated<HaeiResult>>> {
  if (isDemoMode()) {
    const filtered = filterDemo(q);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 10;
    const start = (page - 1) * pageSize;
    return {
      source: "demo",
      data: {
        items: filtered.slice(start, start + pageSize),
        total: filtered.length,
        page,
        pageSize,
      },
    };
  }
  const params = new URLSearchParams();
  if (q.search) params.set("search", q.search);
  if (q.size !== "all" && q.size !== undefined) params.set("size", String(q.size));
  if (q.status && q.status !== "all") params.set("status", q.status);
  if (q.sort) params.set("sort", q.sort);
  if (q.order) params.set("order", q.order);
  if (q.page) params.set("page", String(q.page));
  if (q.pageSize) params.set("pageSize", String(q.pageSize));
  const data = await apiGet<Paginated<HaeiResult>>(
    `${ENDPOINTS.results}?${params.toString()}`,
    { signal },
  );
  return { source: "api", data };
}

export async function getResultDetail(
  itemset: string[],
  signal?: AbortSignal,
): Promise<ServiceResult<HaeiResult>> {
  if (isDemoMode()) {
    const key = itemset.join(",");
    const r = DEMO_RESULTS.find((x) => x.itemset.join(",") === key);
    if (!r) throw new Error(`Không tìm thấy kết quả {${key}} trong dữ liệu demo.`);
    return { source: "demo", data: r };
  }
  const data = await apiGet<HaeiResult>(ENDPOINTS.result(itemset), { signal });
  return { source: "api", data };
}

/** Tải CSV: backend thật → GET /results/export; demo → tạo CSV từ dữ liệu demo. */
export async function exportResultsCsv(): Promise<{ filename: string; content: string }> {
  if (!isDemoMode()) {
    const res = await fetch(`${ENDPOINTS.resultsExport}?format=csv`);
    if (!res.ok) throw new Error(`Backend trả về lỗi ${res.status} khi xuất CSV.`);
    return { filename: "haei-results.csv", content: await res.text() };
  }
  const header = "itemset,size,sdae,minae,isHaei,expandable,entryCount";
  const rows = DEMO_RESULTS.map((r) =>
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
  return { filename: "haei-results-demo.csv", content: [header, ...rows].join("\n") };
}
