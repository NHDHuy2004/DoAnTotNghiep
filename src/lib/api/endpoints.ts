/**
 * Cấu hình API tập trung — không hardcode URL ở nơi khác.
 *
 * URL backend:
 *   1. Ghi đè trên trình duyệt (trang Cài đặt, localStorage) — áp dụng ngay, không cần rebuild.
 *   2. Env `NEXT_PUBLIC_API_BASE_URL` (giá trị lúc build).
 *
 * Quy tắc DEMO mode (xem `computeDemoMode`):
 *   - Có URL ghi đè từ trang Cài đặt → dùng backend (bật override là chủ đích nối backend).
 *   - Không có override: env `NEXT_PUBLIC_DEMO_MODE=true` → DEMO; hoặc chưa có URL nào → DEMO.
 *
 * Ghi chú: đọc localStorage KHÔNG được thực hiện trực tiếp trong render —
 * AppContext dùng `useSyncExternalStore` với các getter bên dưới để an toàn SSR;
 * services gọi `isDemoMode()` / `getApiBaseUrl()` trong event handler hoặc effect.
 */
export const ENV_API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(
  /\/+$/,
  "",
);

export const DEMO_MODE_RAW = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export const LOCAL_API_URL_KEY = "haeim.apiBaseUrl";
const CHANGE_EVENT = "haeim:apiurl-change";

function normalize(url: string | null | undefined): string {
  return (url ?? "").trim().replace(/\/+$/, "");
}

function readOverride(): string {
  if (typeof window === "undefined") return "";
  try {
    return normalize(window.localStorage.getItem(LOCAL_API_URL_KEY));
  } catch {
    return ""; // localStorage bị chặn → fallback env
  }
}

/* ---- Dùng cho useSyncExternalStore (UI đọc URL/override an toàn SSR) ---- */

export const getApiUrlOverrideClientSnapshot = (): string => readOverride();
export const getApiUrlOverrideServerSnapshot = (): string => "";

export function subscribeApiUrl(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === LOCAL_API_URL_KEY) cb();
  };
  window.addEventListener(CHANGE_EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

/** Ghi/ xóa URL backend (trang Cài đặt) + phát sự kiện để UI cập nhật ngay. */
export function setApiUrlOverride(url: string): void {
  if (typeof window === "undefined") return;
  const trimmed = normalize(url);
  if (trimmed) window.localStorage.setItem(LOCAL_API_URL_KEY, trimmed);
  else window.localStorage.removeItem(LOCAL_API_URL_KEY);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/* ---- Hàm thuần: dùng chung cho render (context) và service (gọi API) ---- */

/** URL backend hiệu lực = override (nếu có) hoặc env. */
export function getApiBaseUrl(): string {
  return readOverride() || ENV_API_BASE_URL;
}

/** Quy tắc DEMO — thuần, không đọc storage. */
export function computeDemoMode(effectiveUrl: string, override: string): boolean {
  if (override) return false;
  return DEMO_MODE_RAW || effectiveUrl.length === 0;
}

/** DEMO mode — chỉ gọi ở event handler / effect / snapshot. */
export function isDemoMode(): boolean {
  const override = readOverride();
  return computeDemoMode(override || ENV_API_BASE_URL, override);
}

export const ENDPOINTS = {
  health: "/health",
  transactions: "/transactions",
  transaction: (tid: number) => `/transactions/${tid}`,
  transactionsLatest: "/transactions/latest",
  transactionsImport: "/transactions/import",
  config: "/config",
  configReset: "/config/reset",
  executions: "/executions",
  execution: (id: string) => `/executions/${id}`,
  executionStop: (id: string) => `/executions/${id}/stop`,
  executionPause: (id: string) => `/executions/${id}/pause`,
  executionResume: (id: string) => `/executions/${id}/resume`,
  executionPhase: (id: string, phase: string) => `/executions/${id}/phases/${phase}`,
  executionLogs: (id: string) => `/executions/${id}/logs`,
  daeList: "/dae-list",
  daeListNode: (itemset: string[]) => `/dae-list/${encodeURIComponent(itemset.join(","))}`,
  results: "/results",
  result: (itemset: string[]) => `/results/${encodeURIComponent(itemset.join(","))}`,
  resultsExport: "/results/export",
} as const;
