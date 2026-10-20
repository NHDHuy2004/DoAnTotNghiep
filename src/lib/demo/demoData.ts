/**
 * Bộ dữ liệu minh họa — trích nguyên văn từ tài liệu
 * "TongHop_LuongXuLy_HAEIM_Damped.pdf" (Bảng 1 & Bảng 2).
 *
 * NHẬN DẤU DEMO: mọi giá trị tại đây chỉ dùng khi `NEXT_PUBLIC_DEMO_MODE=true`.
 * Khi backend có thật, các service sẽ gọi API và không dùng file này.
 *
 * Tham số ví dụ trong tài liệu: f = 0.8, Ltid = 8, minae = 0.2
 * (đối chiếu: Sdae({a})=0.188, {b}=0.542, {c}=0.598 khớp bảng kết quả cuối tài liệu).
 */
import type {
  AlgorithmConfig,
  ConstructionTrace,
  DaeListNode,
  ExpansionTrace,
  HaeiResult,
  RestructureTrace,
  Transaction,
} from "@/lib/types";

export const DEMO_F = 0.8;
export const DEMO_MINAE = 0.2;
export const DEMO_LTID = 8;

/** Bảng 2 — chi phí đơn vị cu(i) và chi phí đầu tư đơn vị inv(i). */
export const DEMO_ITEM_COSTS = [
  { item: "a", cu: 12, inv: 96 },
  { item: "b", cu: 3, inv: 51 },
  { item: "c", cu: 4, inv: 72 },
  { item: "d", cu: 9, inv: 162 },
  { item: "e", cu: 13, inv: 91 },
  { item: "f", cu: 5, inv: 50 },
] as const;

export const DEMO_INVESTMENT: Record<string, number> = Object.fromEntries(
  DEMO_ITEM_COSTS.map((r) => [r.item, r.inv]),
);
export const DEMO_UNIT_COST: Record<string, number> = Object.fromEntries(
  DEMO_ITEM_COSTS.map((r) => [r.item, r.cu]),
);

export const DEMO_CONFIG: AlgorithmConfig = {
  f: DEMO_F,
  minae: DEMO_MINAE,
  investmentTable: DEMO_INVESTMENT,
  unitCostTable: DEMO_UNIT_COST,
  runMode: "full",
};

/** Bảng 1 — luồng dữ liệu giao dịch (8 giao dịch). */
export const DEMO_TRANSACTIONS: Transaction[] = [
  {
    tid: 1,
    items: [
      { item: "a", quantity: 1, utility: 4 },
      { item: "c", quantity: 1, utility: 5 },
      { item: "d", quantity: 2, utility: 4 },
      { item: "f", quantity: 1, utility: 2 },
    ],
    tu: 15,
    processed: true,
  },
  {
    tid: 2,
    items: [
      { item: "a", quantity: 1, utility: 4 },
      { item: "b", quantity: 2, utility: 6 },
      { item: "c", quantity: 2, utility: 10 },
      { item: "d", quantity: 5, utility: 10 },
      { item: "e", quantity: 2, utility: 8 },
      { item: "f", quantity: 6, utility: 12 },
    ],
    tu: 50,
    processed: true,
  },
  {
    tid: 3,
    items: [
      { item: "a", quantity: 1, utility: 4 },
      { item: "b", quantity: 2, utility: 6 },
      { item: "c", quantity: 5, utility: 25 },
      { item: "e", quantity: 1, utility: 4 },
    ],
    tu: 39,
    processed: true,
  },
  {
    tid: 4,
    items: [
      { item: "b", quantity: 4, utility: 12 },
      { item: "c", quantity: 2, utility: 10 },
      { item: "d", quantity: 4, utility: 8 },
      { item: "e", quantity: 1, utility: 4 },
    ],
    tu: 34,
    processed: true,
  },
  {
    tid: 5,
    items: [
      { item: "b", quantity: 2, utility: 6 },
      { item: "c", quantity: 3, utility: 15 },
      { item: "d", quantity: 2, utility: 4 },
      { item: "e", quantity: 1, utility: 4 },
      { item: "f", quantity: 1, utility: 2 },
    ],
    tu: 31,
    processed: true,
  },
  {
    tid: 6,
    items: [
      { item: "a", quantity: 3, utility: 12 },
      { item: "b", quantity: 4, utility: 12 },
      { item: "c", quantity: 2, utility: 10 },
      { item: "d", quantity: 1, utility: 2 },
    ],
    tu: 36,
    processed: true,
  },
  {
    tid: 7,
    items: [
      { item: "a", quantity: 1, utility: 4 },
      { item: "b", quantity: 1, utility: 3 },
      { item: "c", quantity: 2, utility: 10 },
      { item: "d", quantity: 3, utility: 6 },
      { item: "f", quantity: 2, utility: 4 },
    ],
    tu: 27,
    processed: true,
  },
  {
    tid: 8,
    items: [
      { item: "a", quantity: 1, utility: 4 },
      { item: "b", quantity: 2, utility: 6 },
      { item: "c", quantity: 1, utility: 5 },
      { item: "d", quantity: 1, utility: 2 },
      { item: "e", quantity: 2, utility: 8 },
    ],
    tu: 25,
    processed: true,
  },
];

const T = DEMO_TRANSACTIONS;

/** Tập con của giao dịch: {tid → Σ utility của các item trong itemset}. */
function utilityMap(itemset: string[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const t of T) {
    let u = 0;
    for (const it of t.items) {
      if (itemset.includes(it.item)) u += it.utility;
    }
    if (u > 0) m.set(t.tid, u);
  }
  return m;
}

export function demoInv(itemset: string[]): number {
  return itemset.reduce((s, i) => s + (DEMO_INVESTMENT[i] ?? 0), 0);
}

/** Trọng số suy giảm f^(Ltid - tid) — Công thức trọng số trong tài liệu. */
export function demoWeight(tid: number, ltid = DEMO_LTID, f = DEMO_F): number {
  return Math.pow(f, ltid - tid);
}

/** Sdae = Σ dae(t) với dae(t) = ae(t) × f^(Ltid−tid), ae(t)=u(t)/Inv(P). */
export function demoSdae(itemset: string[]): number {
  const inv = demoInv(itemset);
  if (inv <= 0) return 0;
  const um = utilityMap(itemset);
  let s = 0;
  for (const [tid, u] of um) {
    s += (u / inv) * demoWeight(tid);
  }
  return s;
}

/* ---------------- Construction trace (Ví dụ 1) ---------------- */

/**
 * Ví dụ 1 trong tài liệu: mục {a}, giao dịch T1.
 * Entry lưu: tid=1, u=4, ae=0.0417, MAEUB=0.0417, minInv=0.
 * ae = u / inv(a) = 4 / 96 = 0.0417.
 */
export const DEMO_CONSTRUCTION: ConstructionTrace = {
  steps: T.map((t) => ({
    tid: t.tid,
    items: t.items.map((it) => {
      const inv = DEMO_INVESTMENT[it.item] ?? 0;
      const aeRaw = inv > 0 ? it.utility / inv : 0;
      return {
        item: it.item,
        u: it.utility,
        inv,
        aeRaw: Number(aeRaw.toFixed(6)),
        // MAEUB thô: tài liệu chỉ nêu chi tiết cho {a} ở T1 (= ae).
        maeubRaw: t.tid === 1 && it.item === "a" ? Number(aeRaw.toFixed(6)) : undefined,
      };
    }),
    newNodes: t.tid === 1 ? ["a", "c", "d", "f"] : t.items.map((i) => i.item),
    entriesAdded: t.items.map((it) => {
      const inv = DEMO_INVESTMENT[it.item] ?? 0;
      return {
        itemset: [it.item],
        tid: t.tid,
        u: it.utility,
        aeRaw: Number((inv > 0 ? it.utility / inv : 0).toFixed(6)),
        maeubRaw: t.tid === 1 && it.item === "a" ? Number((it.utility / inv).toFixed(6)) : undefined,
      };
    }),
  })),
};

/* ---------------- Restructure trace (Ví dụ 2) ---------------- */

/**
 * Bảng SMDAEUB trong tài liệu (Ví dụ 2):
 * a 0.206, b 0.544, c 0.598, d 0.129, e 0.193, f 0.171.
 * Với minae = 0.2 → chỉ a, b, c thỏa, được giữ lại.
 *
 * Lưu ý: tài liệu nêu rõ SMDAEUB là tổng MDAEUB (cận trên) do backend tính
 * bằng chiến lược duyệt tham lam; các giá trị này được lấy nguyên văn từ
 * bảng ví dụ, frontend KHÔNG tự tính lại.
 */
const DEMO_SMDAEUB: Record<string, number> = {
  a: 0.206,
  b: 0.544,
  c: 0.598,
  d: 0.129,
  e: 0.193,
  f: 0.171,
};

export const DEMO_RESTRUCTURE: RestructureTrace = (() => {
  const singles = Object.keys(DEMO_SMDAEUB).sort();
  const nodes = singles.map((item) => {
    const itemset = [item];
    const um = utilityMap(itemset);
    const inv = demoInv(itemset);
    const entries = [...um.entries()]
      .sort((x, y) => x[0] - y[0])
      .map(([tid, u]) => {
        const aeRaw = u / inv;
        return {
          tid,
          u,
          weight: Number(demoWeight(tid).toFixed(6)),
          aeRaw: Number(aeRaw.toFixed(6)),
          dae: Number((aeRaw * demoWeight(tid)).toFixed(6)),
          // MDAEUB cấp entry: tài liệu không nêu đủ dữ liệu thô cho từng giao dịch,
          // chỉ có tổng SMDAEUB ở cấp node → giữ undefined.
          mdaeub: undefined as number | undefined,
        };
      });
    const sdae = entries.reduce((s, e) => s + e.dae, 0);
    const kept = DEMO_SMDAEUB[item] >= DEMO_MINAE;
    return {
      itemset,
      entries,
      sdae: Number(sdae.toFixed(4)),
      smdaeub: DEMO_SMDAEUB[item],
      kept,
      removeReason: kept ? undefined : `SMDAEUB (${DEMO_SMDAEUB[item]}) < minae (${DEMO_MINAE})`,
    };
  });
  const keptNodes = nodes
    .filter((n) => n.kept)
    .sort((x, y) => x.smdaeub - y.smdaeub);
  return {
    ltid: DEMO_LTID,
    f: DEMO_F,
    minae: DEMO_MINAE,
    removed: nodes.filter((n) => !n.kept),
    kept: keptNodes,
  };
})();

/* ---------------- Expansion trace (Ví dụ 5) ---------------- */

/**
 * Ví dụ 5 — ghép {b} với {c}:
 * - Giao dịch đồng xuất hiện của {b} và {c}: T2..T8
 * - Tiện ích u({b,c}) tại T3..T8 lần lượt: 31, 22, 21, 22, 13, 11
 *   (T2 = 16 theo bảng 1)
 * - STDAEUB({c}) = 0 → không mở rộng được
 * - Kết quả cuối: {a} 0.188 (không phải HAEI), {b} 0.542, {c} 0.598, {b,c} 0.2047
 */
export const DEMO_RESULTS: HaeiResult[] = [
  { itemset: ["a"], size: 1, sdae: 0.188, minae: DEMO_MINAE, isHaei: false, expandable: false, entryCount: 6, note: "Sdae < minae → không phải HAEI" },
  { itemset: ["b"], size: 1, sdae: 0.542, minae: DEMO_MINAE, isHaei: true, expandable: true, entryCount: 7, note: "HAEI, STDAEUB ≥ minae → tiếp tục mở rộng" },
  { itemset: ["c"], size: 1, sdae: 0.598, minae: DEMO_MINAE, isHaei: true, expandable: false, entryCount: 8, note: "HAEI, nhưng STDAEUB = 0 → không mở rộng được" },
  { itemset: ["b", "c"], size: 2, sdae: 0.2047, minae: DEMO_MINAE, isHaei: true, expandable: false, entryCount: 7, note: "HAEI (ghép {b} với {c}), không còn DAE-List sau {c} để mở rộng" },
];

export const DEMO_EXPANSION: ExpansionTrace = (() => {
  const roots = ["a", "b", "c"].map((item) => {
    const itemset = [item];
    const sdae = DEMO_RESULTS.find((r) => r.itemset[0] === item)!.sdae;
    const node: ExpansionTrace["roots"][number] = {
      id: itemset.join(","),
      itemset,
      sdae,
      isHaei: sdae >= DEMO_MINAE,
      // STDAEUB: tài liệu chỉ nêu {c} → STDAEUB = 0; {a} bị loại ở bước Sdae,
      // {b} tiếp tục mở rộng.
      canExpand: item === "b",
      pruneReason:
        item === "a"
          ? `Sdae (${sdae}) < minae (${DEMO_MINAE}) → không phải HAEI`
          : item === "c"
            ? "STDAEUB = 0 → không còn khả năng mở rộng"
            : undefined,
      children: [],
    };
    if (item === "b") {
      node.children.push({
        id: "b,c",
        itemset: ["b", "c"],
        sdae: 0.2047,
        isHaei: true,
        canExpand: false,
        pruneReason: "Không còn DAE-List nào đứng sau {c} trong thứ tự sắp xếp",
        merge: {
          left: ["b"],
          right: ["c"],
          coOccurTids: [2, 3, 4, 5, 6, 7, 8],
          utilities: [16, 31, 22, 21, 22, 13, 11],
          sdae: 0.2047,
        },
        children: [],
      });
    }
    return node;
  });
  return { roots, results: [["b"], ["c"], ["b", "c"]] };
})();

/* ---------------- DAE-List Explorer ---------------- */

/**
 * DAE-List toàn cục sau pha Restructure, kết hợp giá trị thô từ Construction
 * (ae = u/Inv) và tổng SMDAEUB nguyên văn từ bảng ví dụ trong tài liệu.
 */
export const DEMO_DAE_LIST: DaeListNode[] = (() => {
  const result = DEMO_RESULTS;
  const smdaeubOf = (item: string) => DEMO_SMDAEUB[item];
  const singles = ["a", "b", "c", "d", "e", "f"];
  const singleNodes: DaeListNode[] = singles.map((item) => {
    const itemset = [item];
    const um = utilityMap(itemset);
    const inv = demoInv(itemset);
    const entries = [...um.entries()]
      .sort((x, y) => x[0] - y[0])
      .map(([tid, u]) => ({
        tid,
        u,
        value: Number((u / inv).toFixed(6)),
        phase: "construction" as const,
      }));
    const res = result.find((r) => r.itemset.length === 1 && r.itemset[0] === item);
    return {
      itemset,
      inv,
      pi: 0,
      sdae: res?.sdae ?? Number(demoSdae(itemset).toFixed(4)),
      smdaeub: smdaeubOf(item),
      stdaeub: item === "c" ? 0 : undefined as unknown as number,
      entryCount: entries.length,
      status: res?.isHaei ? "haei" : "eliminated",
      entries,
    } as DaeListNode;
  });
  // Node {b,c} từ ví dụ ghép
  const pairUm = utilityMap(["b", "c"]);
  const pairEntries = [...pairUm.entries()]
    .sort((x, y) => x[0] - y[0])
    .map(([tid, u]) => ({
      tid,
      u,
      value: Number((u / demoInv(["b", "c"])).toFixed(6)),
      phase: "restructure" as const,
    }));
  const pairNode: DaeListNode = {
    itemset: ["b", "c"],
    inv: demoInv(["b", "c"]),
    pi: 0,
    sdae: 0.2047,
    smdaeub: 0,
    stdaeub: 0,
    entryCount: pairEntries.length,
    status: "haei",
    entries: pairEntries,
  };
  return [...singleNodes, pairNode];
})();

/** Số liệu tổng quan cho Dashboard. */
export const DEMO_DASHBOARD = {
  totalTransactions: DEMO_TRANSACTIONS.length,
  totalItems: DEMO_ITEM_COSTS.length,
  totalItemsets: DEMO_DAE_LIST.length,
  totalHaei: DEMO_RESULTS.filter((r) => r.isHaei).length,
  minae: DEMO_MINAE,
  f: DEMO_F,
  ltid: DEMO_LTID,
  executionTimeMs: 42,
  phaseStats: {
    construction: { in: 8, out: 8, note: "8 giao dịch → 6 node đơn + 1 node {b,c}" },
    restructure: { in: 6, out: 3, note: "loại d, e, f do SMDAEUB < minae" },
    expansion: { in: 3, out: 3, note: "{a} không đạt, {c} không mở rộng, ghép {b}+{c}" },
  },
};
