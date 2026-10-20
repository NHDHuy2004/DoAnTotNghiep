"use client";

import {
  computeDemoMode,
  ENV_API_BASE_URL,
  getApiUrlOverrideClientSnapshot,
  getApiUrlOverrideServerSnapshot,
  setApiUrlOverride,
  subscribeApiUrl,
} from "@/lib/api/endpoints";
import { getConfig } from "@/lib/services/configService";
import { checkBackend, type BackendStatus } from "@/lib/services/healthService";
import type { AlgorithmConfig, ExecutionSession } from "@/lib/types";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

interface AppState {
  /** URL backend hiệu lực (env hoặc bản ghi đè từ trang Cài đặt). */
  apiBaseUrl: string;
  /** Bản ghi đè URL đang lưu trên trình duyệt ("" = không ghi đè). */
  apiOverride: string;
  /** Ghi/ xóa URL backend trên trình duyệt — áp dụng ngay, không cần reload. */
  setApiBaseUrl: (url: string) => void;

  demoMode: boolean;
  backendStatus: BackendStatus;
  refreshBackend: () => void;

  config: AlgorithmConfig | null;
  configLoading: boolean;
  configError: string | null;
  reloadConfig: () => void;
  setConfig: (cfg: AlgorithmConfig) => void;

  /** Phiên thực thi đang hoạt động (nếu có) — dùng ở Header + trang Execution. */
  activeSession: ExecutionSession | null;
  setActiveSession: (s: ExecutionSession | null) => void;

  /** Đánh dấu cấu hình chưa lưu (hiện confirm dialog khi chạy mới). */
  configDirty: boolean;
  setConfigDirty: (v: boolean) => void;
}

const Ctx = createContext<AppState | null>(null);

interface ConfigState {
  of: number;
  config: AlgorithmConfig | null;
  error: string | null;
}

export function AppProvider({ children }: { children: ReactNode }) {
  // Đọc bản ghi đè URL từ localStorage qua external store — an toàn SSR.
  const override = useSyncExternalStore(
    subscribeApiUrl,
    getApiUrlOverrideClientSnapshot,
    getApiUrlOverrideServerSnapshot,
  );
  const apiBaseUrl = override || ENV_API_BASE_URL;
  // Cùng một quy tắc với services (isDemoMode) — không đọc localStorage trong render.
  const demoMode = computeDemoMode(apiBaseUrl, override);

  const [backendStatus, setBackendStatus] = useState<BackendStatus>(
    demoMode ? "demo" : "checking",
  );
  const [statusTick, setStatusTick] = useState(0);
  // Theo dõi thay đổi demoMode để reset trạng thái (điều chỉnh state trong render).
  const [prevDemoMode, setPrevDemoMode] = useState(demoMode);
  if (demoMode !== prevDemoMode) {
    setPrevDemoMode(demoMode);
    setBackendStatus(demoMode ? "demo" : "checking");
  }

  const [configTick, setConfigTick] = useState(0);
  const [cfg, setCfg] = useState<ConfigState>({ of: -1, config: null, error: null });
  const [configDirty, setConfigDirty] = useState(false);

  const [activeSession, setActiveSession] = useState<ExecutionSession | null>(null);

  useEffect(() => {
    if (demoMode) return;
    let active = true;
    checkBackend().then((s) => {
      if (active) setBackendStatus(s);
    });
    return () => {
      active = false;
    };
  }, [demoMode, statusTick]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    getConfig(controller.signal)
      .then((res) => {
        if (!active) return;
        setCfg({ of: configTick, config: res.data, error: null });
        setConfigDirty(false);
      })
      .catch((err: unknown) => {
        if (!active || controller.signal.aborted) return;
        setCfg({
          of: configTick,
          config: null,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [configTick]);

  const configSettled = cfg.of === configTick;

  const value = useMemo<AppState>(
    () => ({
      apiBaseUrl,
      apiOverride: override,
      setApiBaseUrl: (url: string) => {
        setApiUrlOverride(url);
        // Khi đổi backend, kiểm tra lại kết nối ở lần render sau.
        setStatusTick((t) => t + 1);
      },
      demoMode,
      backendStatus,
      refreshBackend: () => setStatusTick((t) => t + 1),
      config: cfg.config,
      configLoading: !configSettled,
      configError: configSettled ? cfg.error : null,
      reloadConfig: () => setConfigTick((t) => t + 1),
      setConfig: (next) => {
        setCfg({ of: configTick, config: next, error: null });
        setConfigDirty(true);
      },
      activeSession,
      setActiveSession,
      configDirty,
      setConfigDirty,
    }),
    [
      apiBaseUrl,
      override,
      demoMode,
      backendStatus,
      cfg,
      configSettled,
      configTick,
      activeSession,
      configDirty,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp phải dùng trong AppProvider");
  return ctx;
}
