import { ApiError } from "@/lib/types";
import { getApiBaseUrl } from "./endpoints";

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  timeoutMs?: number;
}

/**
 * HTTP client dùng chung: JSON, timeout, hủy request cũ bằng AbortSignal,
 * lỗi → ApiError có message dễ hiểu cho UI.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new ApiError(
      "Chưa cấu hình backend (NEXT_PUBLIC_API_BASE_URL). Hãy bật DEMO mode hoặc nhập URL backend ở trang Cài đặt.",
      undefined,
      path,
    );
  }

  const { body, timeoutMs = 15000, signal, headers, ...rest } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  // Hủy từ bên ngoài (unmount) + timeout nội bộ
  const onExternalAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", onExternalAbort);
  }

  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");
  if (body !== undefined) requestHeaders.set("Content-Type", "application/json");

  const url = `${baseUrl}${path}`;
  try {
    const res = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      let detail = "";
      try {
        const payload = (await res.json()) as { message?: string; error?: string };
        detail = payload.message ?? payload.error ?? "";
      } catch {
        // response không phải JSON → bỏ qua
      }
      throw new ApiError(
        detail || `Backend trả về lỗi ${res.status} ${res.statusText}`,
        res.status,
        path,
      );
    }

    if (res.status === 204) return undefined as T;
    const text = await res.text();
    // 2xx không có nội dung → không phải lỗi kết nối, trả về rỗng
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new ApiError(
        `Backend trả về dữ liệu không phải JSON (${res.status} ${res.statusText}).`,
        res.status,
        path,
      );
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    const msg =
      err instanceof DOMException && err.name === "AbortError"
        ? "Yêu cầu đã bị hủy (timeout hoặc rời trang)."
        : `Không thể kết nối tới backend: ${err instanceof Error ? err.message : String(err)}`;
    throw new ApiError(msg, undefined, path);
  } finally {
    clearTimeout(timer);
    // Không gắn listener vào signal của người gọi → tránh rò rỉ khi signal sống lâu
    signal?.removeEventListener("abort", onExternalAbort);
  }
}

export const apiGet = <T>(path: string, options?: RequestOptions) =>
  apiFetch<T>(path, { ...options, method: "GET" });
export const apiPost = <T>(path: string, body?: unknown, options?: RequestOptions) =>
  apiFetch<T>(path, { ...options, method: "POST", body });
export const apiPut = <T>(path: string, body?: unknown, options?: RequestOptions) =>
  apiFetch<T>(path, { ...options, method: "PUT", body });
