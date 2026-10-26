import { apiGet } from "@/lib/api/client";
import { ENDPOINTS, getApiBaseUrl, isDemoMode } from "@/lib/api/endpoints";

export type BackendStatus = "demo" | "connected" | "unreachable" | "checking";

/** Cache theo URL — đổi backend là khác phiên bản, không được trả kết quả cũ. */
let cached: { status: BackendStatus; at: number; url: string } = {
  status: "checking",
  at: 0,
  url: "",
};

/**
 * Kiểm tra kết nối backend (cache 10 giây cho CÙNG một URL).
 * Truyền `force = true` khi người dùng bấm "Kiểm tra lại" / sau khi đổi URL.
 */
export async function checkBackend(force = false): Promise<BackendStatus> {
  const now = Date.now();
  const url = getApiBaseUrl();
  if (!force && cached.url === url && now - cached.at < 10_000) return cached.status;

  if (isDemoMode()) {
    cached = { status: "demo", at: now, url };
    return "demo";
  }
  try {
    await apiGet(ENDPOINTS.health, { timeoutMs: 5000 });
    cached = { status: "connected", at: now, url };
  } catch {
    cached = { status: "unreachable", at: now, url };
  }
  return cached.status;
}
