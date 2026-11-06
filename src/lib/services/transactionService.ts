import { apiGet, apiPost } from "@/lib/api/client";
import { ENDPOINTS, isDemoMode } from "@/lib/api/endpoints";
import {
  DEMO_TRANSACTIONS,
} from "@/lib/demo/demoData";
import type {
  Paginated,
  ServiceResult,
  Transaction,
  TransactionInput,
} from "@/lib/types";
import { ApiError } from "@/lib/types";

export interface TransactionQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  processed?: boolean;
}

function filterDemo(q: TransactionQuery): Transaction[] {
  const raw = (q.search ?? "").trim().toLowerCase();
  // UI hiển thị TID dạng "T3" → cho phép gõ kèm (hoặc không kèm) chữ T
  const search = /^t\d+$/.test(raw) ? raw.slice(1) : raw;
  return DEMO_TRANSACTIONS.filter((t) => {
    if (q.processed !== undefined && t.processed !== q.processed) return false;
    if (!search) return true;
    if (String(t.tid).includes(search)) return true;
    return t.items.some((it) => it.item.toLowerCase().includes(search));
  });
}

/** Danh sách giao dịch có phân trang + tìm kiếm theo TID/mục. */
export async function listTransactions(
  q: TransactionQuery,
  signal?: AbortSignal,
): Promise<ServiceResult<Paginated<Transaction>>> {
  const page = q.page ?? 1;
  const pageSize = q.pageSize ?? 10;

  if (isDemoMode()) {
    const filtered = filterDemo(q);
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

  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (q.search) params.set("search", q.search);
  // Hợp đồng API (docs/API_CONTRACT.md): tham số `status`
  if (q.processed !== undefined) params.set("status", q.processed ? "processed" : "unprocessed");

  const data = await apiGet<Paginated<Transaction>>(
    `${ENDPOINTS.transactions}?${params.toString()}`,
    { signal },
  );
  return { source: "api", data };
}

export async function getTransaction(
  tid: number,
  signal?: AbortSignal,
): Promise<ServiceResult<Transaction>> {
  if (isDemoMode()) {
    const t = DEMO_TRANSACTIONS.find((x) => x.tid === tid);
    if (!t) throw new ApiError(`Không tìm thấy giao dịch T${tid} trong dữ liệu demo.`, 404);
    return { source: "demo", data: t };
  }
  const data = await apiGet<Transaction>(ENDPOINTS.transaction(tid), { signal });
  return { source: "api", data };
}

export async function createTransaction(
  input: TransactionInput,
): Promise<ServiceResult<Transaction>> {
  if (isDemoMode()) {
    // DEMO: gán tid mới trong phiên làm việc, không lưu bền vững.
    return { source: "demo", data: createTransactionSync(input) };
  }
  // Backend yêu cầu: mọi item phải có trong bảng EU/INV (POST /api/items)
  // và body dùng tên `qty` (không phải `quantity`).
  await ensureItemsRegistered(input);
  const res = await apiPost<{ tid: number }>(ENDPOINTS.transactions, {
    items: input.items.map((it) => ({ item: it.item, qty: it.quantity })),
  });
  // Response POST chỉ có tid/ltid → lấy bản giao dịch đầy đủ (items/tu)
  const data = await apiGet<Transaction>(ENDPOINTS.transaction(res.tid));
  return { source: "api", data };
}

/** Bảng chi phí hiện tại (luôn tải mới — tránh cache cũ sau khi backend restart). */
async function fetchCostTables(): Promise<{
  eu: Record<string, number>;
  inv: Record<string, number>;
  cu: Record<string, number>;
}> {
  const w = await apiGet<{
    eu: Record<string, number>;
    inv: Record<string, number>;
    cu: Record<string, number>;
  }>(ENDPOINTS.config);
  return { eu: w.eu ?? {}, inv: w.inv ?? {}, cu: w.cu ?? {} };
}

/**
 * Đăng ký các item CHƯA có trong EU/INV của backend.
 *
 * - eu = utility / qty (cùng cách suy eu của Bảng 1 PDF);
 * - inv = cu × qty theo quy ước `inv = cu × tổng qty` của backend;
 * - item đã tồn tại → bỏ qua (backend từ chối đăng ký trùng).
 */
async function ensureItemsRegistered(input: TransactionInput): Promise<void> {
  const tables = await fetchCostTables();
  for (const it of input.items) {
    if (it.item in tables.eu || it.item in tables.inv) continue;
    const qty = it.quantity;
    const eu = qty > 0 ? it.utility / qty : 0;
    const cu = tables.cu[it.item] ?? 1;
    await apiPost(ENDPOINTS.items, {
      item: it.item,
      eu: eu > 0 ? eu : 1,
      inv: (cu > 0 ? cu : 1) * qty,
      cu: cu > 0 ? cu : undefined,
    });
  }
}

export async function importTransactions(
  format: "csv" | "json",
  content: string,
): Promise<ServiceResult<{ imported: number; errors: { line: number; message: string }[] }>> {
  if (isDemoMode()) {
    const errors: { line: number; message: string }[] = [];
    let imported = 0;
    try {
      if (format === "json") {
        const parsed = JSON.parse(content) as TransactionInput[];
        if (!Array.isArray(parsed)) throw new Error("JSON phải là mảng các giao dịch.");
        parsed.forEach((raw, i) => {
          const err = validateInput(raw);
          if (err) errors.push({ line: i + 1, message: err });
          else {
            createTransactionSync(raw);
            imported++;
          }
        });
      } else {
        // Duyệt mảng GỐC (không lọc dòng trống) để số dòng báo lỗi khớp file của người dùng
        content.split(/\r?\n/).forEach((line, i) => {
          if (!line.trim()) return;
          // Bỏ qua dòng tiêu đề (item,quantity,utility)
          if (i === 0 && /^\s*item\s*,\s*quantity\s*,\s*utility\s*$/i.test(line)) return;
          const parsed = parseCsvLine(line);
          if (!parsed) {
            errors.push({ line: i + 1, message: "Sai định dạng. Cần: item,quantity,utility" });
            return;
          }
          const err = validateInput(parsed);
          if (err) errors.push({ line: i + 1, message: err });
          else {
            createTransactionSync(parsed);
            imported++;
          }
        });
      }
    } catch (e) {
      errors.push({ line: 0, message: e instanceof Error ? e.message : String(e) });
    }
    return { source: "demo", data: { imported, errors } };
  }
  const data = await apiPost<{ imported: number; errors: { line: number; message: string }[] }>(
    ENDPOINTS.transactionsImport,
    { format, content },
  );
  return { source: "api", data };
}

function createTransactionSync(input: TransactionInput): Transaction {
  const nextTid = Math.max(...DEMO_TRANSACTIONS.map((t) => t.tid), 0) + 1;
  const tu = input.items.reduce((s, i) => s + i.utility, 0);
  const t: Transaction = { tid: nextTid, items: input.items, tu, processed: false };
  DEMO_TRANSACTIONS.push(t);
  return t;
}

/** Kiểm tra dữ liệu đầu vào trước khi gửi (bắt buộc ở cả demo lẫn API). */
export function validateInput(input: TransactionInput): string | null {
  if (!input || !Array.isArray(input.items) || input.items.length === 0) {
    return "Giao dịch phải có ít nhất một mục.";
  }
  const seen = new Set<string>();
  for (const it of input.items) {
    if (!it.item || typeof it.item !== "string" || !it.item.trim()) {
      return "Mục (item) không được để trống.";
    }
    if (seen.has(it.item)) return `Mục "${it.item}" bị lặp trong cùng giao dịch.`;
    seen.add(it.item);
    if (!Number.isFinite(it.quantity) || it.quantity <= 0) {
      return `Số lượng của "${it.item}" phải là số dương.`;
    }
    if (!Number.isFinite(it.utility)) {
      return `Utility của "${it.item}" phải là số hợp lệ.`;
    }
  }
  return null;
}

function parseCsvLine(line: string): TransactionInput | null {
  // a,1,4; c,1,5  →  hoặc dạng "item:qty:utility" cách nhau bởi ;
  const parts = line.split(";").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const items = parts.map((p) => {
    const [item, qty, util] = p.split(",").map((x) => x.trim());
    return { item, quantity: Number(qty), utility: Number(util) };
  });
  if (items.some((i) => !i.item || Number.isNaN(i.quantity) || Number.isNaN(i.utility))) {
    return null;
  }
  return { items };
}
