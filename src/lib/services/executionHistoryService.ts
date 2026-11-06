import { ENDPOINTS, isDemoMode } from "@/lib/api/endpoints";
import { getSession, listSessions, saveSession } from "@/lib/services/sessionStore";
import type { ExecutionSession, Paginated, ServiceResult } from "@/lib/types";
import { ApiError } from "@/lib/types";

/**
 * Lịch sử thực thi.
 *
 * - DEMO: giữ danh sách trong phiên làm việc (in-memory).
 * - API: backend không có endpoint executions → đọc/ghi từ `sessionStore`
 *   (localStorage), nơi `algorithmService.startExecution` lưu mỗi phiên.
 */
const demoHistory: ExecutionSession[] = [];

export function pushDemoHistory(session: ExecutionSession): void {
  if (isDemoMode()) {
    const idx = demoHistory.findIndex((s) => s.id === session.id);
    if (idx >= 0) demoHistory[idx] = session;
    else demoHistory.unshift(session);
    return;
  }
  // API mode: lưu bền vững để trang Lịch sử còn dữ liệu sau reload
  saveSession(session);
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
  void signal;
  const page = q.page ?? 1;
  const pageSize = q.pageSize ?? 10;
  // Phiên mới nhất đứng đầu (saveSession unshift) — lọc rồi phân trang
  const filtered = listSessions().filter(
    (s) => !q.status || q.status === "all" || s.status === q.status,
  );
  const start = (page - 1) * pageSize;
  return {
    source: "api",
    data: {
      items: filtered.slice(start, start + pageSize),
      total: filtered.length,
      page,
      pageSize,
    },
  };
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
  void signal;
  const s = getSession(id);
  if (!s) throw new ApiError(`Không tìm thấy phiên ${id} trong lịch sử.`, 404, ENDPOINTS.results);
  return { source: "api", data: s };
}
