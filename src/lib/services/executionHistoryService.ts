import { apiGet } from "@/lib/api/client";
import { ENDPOINTS, isDemoMode } from "@/lib/api/endpoints";
import type { ExecutionSession, Paginated, ServiceResult } from "@/lib/types";

/**
 * Lịch sử thực thi.
 *
 * DEMO mode: giữ danh sách trong phiên làm việc (in-memory) — KHÔNG lưu bền vững.
 * Khi backend hỗ trợ GET /executions, service tự gọi API thật.
 */
const demoHistory: ExecutionSession[] = [];

export function pushDemoHistory(session: ExecutionSession): void {
  if (!isDemoMode()) return;
  const idx = demoHistory.findIndex((s) => s.id === session.id);
  if (idx >= 0) demoHistory[idx] = session;
  else demoHistory.unshift(session);
}

export function clearDemoHistory(): void {
  demoHistory.length = 0;
}

export async function listExecutions(
  q: { page?: number; pageSize?: number; status?: string },
  signal?: AbortSignal,
): Promise<ServiceResult<Paginated<ExecutionSession>>> {
  if (isDemoMode()) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 10;
    const filtered = demoHistory.filter(
      (s) => !q.status || q.status === "all" || s.status === q.status,
    );
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
  if (q.page) params.set("page", String(q.page));
  if (q.pageSize) params.set("pageSize", String(q.pageSize));
  if (q.status && q.status !== "all") params.set("status", q.status);
  const data = await apiGet<Paginated<ExecutionSession>>(
    `${ENDPOINTS.executions}?${params.toString()}`,
    { signal },
  );
  return { source: "api", data };
}

export async function getExecutionDetail(
  id: string,
  signal?: AbortSignal,
): Promise<ServiceResult<ExecutionSession>> {
  if (isDemoMode()) {
    const s = demoHistory.find((x) => x.id === id);
    if (!s) throw new Error(`Không tìm thấy phiên ${id} trong lịch sử demo.`);
    return { source: "demo", data: s };
  }
  const data = await apiGet<ExecutionSession>(ENDPOINTS.execution(id), { signal });
  return { source: "api", data };
}
