import { apiGet } from "@/lib/api/client";
import { ENDPOINTS, isDemoMode } from "@/lib/api/endpoints";

export type BackendStatus = "demo" | "connected" | "unreachable" | "checking";

let cached: { status: BackendStatus; at: number } = { status: "checking", at: 0 };

/** Kiểm tra kết nối backend (có cache 10 giây để tránh gọi lặp). */
export async function checkBackend(force = false): Promise<BackendStatus> {
  const now = Date.now();
  if (!force && now - cached.at < 10_000) return cached.status;

  if (isDemoMode()) {
    cached = { status: "demo", at: now };
    return "demo";
  }
  try {
    await apiGet(ENDPOINTS.health, { timeoutMs: 5000 });
    cached = { status: "connected", at: now };
  } catch {
    cached = { status: "unreachable", at: now };
  }
  return cached.status;
}
