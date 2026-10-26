"use client";

/**
 * Hook dùng chung cho mọi trang: quản lý loading / error / empty / data,
 * tự hủy request cũ khi unmount hoặc khi dependencies đổi.
 *
 * - `data` là dữ liệu bên trong ServiceResult; `source` báo nguồn (api | demo).
 * - `loading` = đang tải lần đầu, hoặc deps đổi (truy vấn mới): dữ liệu của
 *   truy vấn trước bị ẨN (không trộn dữ liệu trang cũ với tiêu đề trang mới).
 * - `reload()` = tải lại CÙNG truy vấn: `loading` vẫn false để màn hình không
 *   chớp về skeleton (trang Thực thi tự làm mới mỗi 5 giây), `refreshing` báo
 *   đang có request chạy. Nếu chưa từng có dữ liệu (retry sau lỗi) → loading.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { ServiceResult } from "@/lib/types";

interface FetchState<T> {
  /** Lần gọi gần nhất đã BẮT ĐẦU (tăng trong effect). */
  started: number;
  /** Lần gọi đã có kết quả (-1 = chưa có kết quả nào cho lần hiện tại). */
  finished: number;
  /** Lần gọi hiện tại là "tải lại cùng truy vấn" hay "truy vấn mới". */
  kind: "query" | "refresh";
  res: ServiceResult<T> | null;
  error: string | null;
  /** deps của lần gọi gần nhất (null = chưa chạy lần nào). */
  deps: unknown[] | null;
}

/** So sánh deps theo từng phần tử (Object.is) — mảng deps mới mỗi render. */
function sameDeps(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => Object.is(v, b[i]));
}

export function useAsync<T>(
  fn: (signal: AbortSignal) => Promise<ServiceResult<T>>,
  deps: unknown[],
  options?: { immediate?: boolean },
): {
  data: T | null;
  source: "api" | "demo" | null;
  loading: boolean;
  /** Đang tải lại cùng truy vấn (reload) — dữ liệu cũ vẫn còn trên màn hình. */
  refreshing: boolean;
  error: string | null;
  reload: () => void;
} {
  const immediate = options?.immediate ?? true;
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<FetchState<T>>({
    started: 0,
    finished: -1,
    kind: "query",
    res: null,
    error: null,
    deps: null,
  });

  const runRef = useRef(0);

  // Giữ fn mới nhất mà effect có thể đọc (cập nhật trong effect, không phải render).
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    if (!immediate) return;
    // deps của lần chạy trước nằm trong state (đọc state trong effect là hợp lệ).
    const isReload = state.deps !== null && sameDeps(state.deps, deps);
    const run = ++runRef.current;

    setState((prev) => ({
      started: run,
      finished: -1,
      kind: isReload ? "refresh" : "query",
      // Truy vấn mới → bỏ dữ liệu cũ; tải lại → giữ dữ liệu cũ đến khi có bản mới.
      res: isReload ? prev.res : null,
      error: null,
      deps,
    }));

    const controller = new AbortController();
    let active = true;
    fnRef
      .current(controller.signal)
      .then((res) => {
        if (!active) return;
        setState((prev) => (prev.started === run ? { ...prev, finished: run, res, error: null } : prev));
      })
      .catch((err: unknown) => {
        if (!active || controller.signal.aborted) return;
        setState((prev) =>
          prev.started === run
            ? {
                ...prev,
                finished: run,
                res: isReload ? prev.res : null,
                error: err instanceof Error ? err.message : String(err),
              }
            : prev,
        );
      });
    return () => {
      active = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps do người gọi quyết định
  }, [...deps, tick, immediate]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  // Deps đổi ngay trong render này mà effect chưa kịp chạy → coi như đang tải.
  const depsChanged = state.deps === null || !sameDeps(state.deps, deps);
  const pending = state.started !== state.finished;
  const queryPending = pending && (state.kind === "query" || state.res === null);
  const loading = immediate && (depsChanged || queryPending);
  const refreshing = immediate && !loading && pending;

  return {
    // Không lộ dữ liệu truy vấn trước khi đang tải truy vấn mới.
    data: loading ? null : state.res?.data ?? null,
    source: state.res?.source ?? null,
    loading,
    refreshing,
    error: loading ? null : state.error,
    reload,
  };
}
