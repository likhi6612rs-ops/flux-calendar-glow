import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface AppFeatures {
  calendar: boolean;
  tasks: boolean;
  focus: boolean;
  insights: boolean;
  promo: boolean;
  promo_text: string;
}

export const DEFAULT_FEATURES: AppFeatures = {
  calendar: true,
  tasks: true,
  focus: true,
  insights: true,
  promo: false,
  promo_text: "",
};

export interface AppConfig {
  appVersion: string;
  features: AppFeatures;
}

const DEFAULT_CONFIG: AppConfig = {
  appVersion: "1.0.0",
  features: DEFAULT_FEATURES,
};

/** Compare two dotted version strings. Returns true when `b` is newer than `a`. */
export function isNewerVersion(a: string, b: string): boolean {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (y > x) return true;
    if (y < x) return false;
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

interface AppConfigContextValue {
  config: AppConfig;
  loading: boolean;
  /** true when the admin has pushed a newer version than the one loaded */
  updateReady: boolean;
  applyUpdate: () => void;
  refresh: () => void;
}

const AppConfigContext = createContext<AppConfigContextValue | null>(null);

function parseRow(row: {
  app_version: string;
  features: unknown;
}): AppConfig {
  const f = (row.features ?? {}) as Partial<AppFeatures>;
  return {
    appVersion: row.app_version ?? "1.0.0",
    features: { ...DEFAULT_FEATURES, ...f },
  };
}

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [updateReady, setUpdateReady] = useState(false);
  // The version that was live when this browser session first loaded.
  const loadedVersion = useRef<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["app-config"],
    queryFn: async (): Promise<AppConfig> => {
      const { data, error } = await supabase
        .from("app_config")
        .select("app_version, features")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data ? parseRow(data) : DEFAULT_CONFIG;
    },
    staleTime: 30_000,
  });

  const config = data ?? DEFAULT_CONFIG;

  // Record the baseline version once, then flag updates when it advances.
  useEffect(() => {
    if (!data) return;
    if (loadedVersion.current === null) {
      loadedVersion.current = data.appVersion;
      return;
    }
    if (isNewerVersion(loadedVersion.current, data.appVersion)) {
      setUpdateReady(true);
    }
  }, [data]);

  // Realtime: react instantly when the admin saves config changes.
  useEffect(() => {
    const channel = supabase
      .channel("app-config-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_config" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["app-config"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["app-config"] });
  }, [queryClient]);

  const applyUpdate = useCallback(() => {
    // Wipe cache storage so the freshest build + config is fetched, then reload.
    try {
      if (typeof window !== "undefined" && "caches" in window) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      }
    } catch {
      /* ignore cache errors */
    }
    window.location.reload();
  }, []);

  const value = useMemo<AppConfigContextValue>(
    () => ({ config, loading: isLoading, updateReady, applyUpdate, refresh }),
    [config, isLoading, updateReady, applyUpdate, refresh],
  );

  return (
    <AppConfigContext.Provider value={value}>
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig() {
  const ctx = useContext(AppConfigContext);
  if (!ctx)
    throw new Error("useAppConfig must be used within AppConfigProvider");
  return ctx;
}
