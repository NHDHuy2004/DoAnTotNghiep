import { apiGet } from "@/lib/api/client";
import { ENDPOINTS, isDemoMode } from "@/lib/api/endpoints";
import { DEMO_DAE_LIST } from "@/lib/demo/demoData";
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

export async function listDaeNodes(
  q: DaeListQuery,
  signal?: AbortSignal,
): Promise<ServiceResult<DaeListNode[]>> {
  if (isDemoMode()) {
    const search = (q.search ?? "").trim().toLowerCase();
    let nodes = DEMO_DAE_LIST.filter((n) => {
      if (q.status && q.status !== "all" && n.status !== q.status) return false;
      if (!search) return true;
      return n.itemset.join("").includes(search.replace(/[{}]/g, ""));
    });
    nodes = [...nodes].sort((a, b) => {
      const c = compare(a, b, q.sort);
      return q.order === "desc" ? -c : c;
    });
    return { source: "demo", data: nodes };
  }
  const params = new URLSearchParams();
  if (q.search) params.set("search", q.search);
  if (q.status && q.status !== "all") params.set("status", q.status);
  if (q.sort) params.set("sort", q.sort);
  if (q.order) params.set("order", q.order);
  const data = await apiGet<{ nodes: DaeListNode[] }>(
    `${ENDPOINTS.daeList}?${params.toString()}`,
    { signal },
  );
  return { source: "api", data: data.nodes };
}

export async function getDaeNode(
  itemset: string[],
  signal?: AbortSignal,
): Promise<ServiceResult<DaeListNode>> {
  if (isDemoMode()) {
    const key = itemset.join(",");
    const node = DEMO_DAE_LIST.find((n) => n.itemset.join(",") === key);
    if (!node) {
      throw new Error(`Không tìm thấy node DAE-List {${key}} trong dữ liệu demo.`);
    }
    return { source: "demo", data: node };
  }
  const data = await apiGet<DaeListNode>(ENDPOINTS.daeListNode(itemset), { signal });
  return { source: "api", data };
}

/** Truy nguồn giao dịch của một entry (nhấn entry → xem giao dịch gốc). */
export type { DaeListEntry };
