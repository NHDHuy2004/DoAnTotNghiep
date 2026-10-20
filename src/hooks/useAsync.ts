"use client";

/**
 * Hook dùng chung cho mọi trang: quản lý loading / error / empty / data,
 * tự hủy request cũ khi unmount hoặc khi dependencies đổi.
 *
 * - `data` là dữ liệu bên trong ServiceResult; `source` báo nguồn (api | demo).
 * - `loading` được SUY RA từ việc kết quả hiện tại đã khớp "lần gọi mới nhất"
 *   chưa — không cần setState đồng bộ trong effect (tránh cascading render).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { ServiceResult } from "@/lib/types";

interface FetchState<T> {
  /** Lần gọi mà kết quả hiện tại thuộc về (-1 = chưa có kết quả nào). */
  of: number;
  res: ServiceResult<T> | null;
  error: string | null;
}

export function useAsync<T>(
  fn: (signal: AbortSignal) => Promise<ServiceResult<T>>,
  deps: unknown[],
  options?: { immediate?: boolean },
): {
  data: T | null;
  source: "api" | "demo" | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const immediate = options?.immediate ?? true;
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<FetchState<T>>({ of: -1, res: null, error: null });

  // Giữ fn mới nhất mà effect có thể đọc (cập nhật trong effect, không phải render).
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    if (!immediate) return;
    const controller = new AbortController();
    let active = true;
    fnRef
      .current(controller.signal)
      .then((res) => {
        if (!active) return;
        setState({ of: tick, res, error: null });
      })
      .catch((err: unknown) => {
        if (!active || controller.signal.aborted) return;
        setState({
          of: tick,
          res: null,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    return () => {
      active = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps do người gọi quyết định
  }, [...deps, tick, immediate]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  // Kết quả đang hiển thị có thuộc về lần gọi mới nhất không?
  const settled = state.of === tick;
  return {
    data: state.res?.data ?? null,
    source: state.res?.source ?? null,
    loading: immediate && !settled,
    error: settled ? state.error : null,
    reload,
  };
}
