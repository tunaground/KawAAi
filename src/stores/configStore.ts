import { create } from "zustand";
import type { AppConfig, AutoSaveInterval } from "../types/config";
import { DEFAULT_CONFIG } from "../types/config";

const STORAGE_KEY = "kawaii_config";

type ThemeMode = "system" | "light" | "dark";

/** 설정 저장: Tauri → config.json / 웹 → localStorage */
async function persistConfig(config: AppConfig) {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("save_config", { data: config });
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }
}

/** 설정 로드 */
async function loadPersistedConfig(): Promise<AppConfig | null> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const data = await invoke<AppConfig | null>("load_config");
    if (data && typeof data === "object") return data;
  } catch {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { return JSON.parse(stored); } catch {}
    }
  }
  return null;
}

interface ConfigState {
  config: AppConfig;
  resolvedTheme: "light" | "dark";
  initFromStorage: () => Promise<void>;
  setTheme: (mode: ThemeMode) => void;
  setLocale: (locale: AppConfig["locale"]) => void;
  setPreviewMode: (mode: AppConfig["previewMode"]) => void;
  setAutoSaveInterval: (interval: AutoSaveInterval) => void;
  updateConfig: (updates: Partial<AppConfig>) => void;
}

function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return mode;
}

function applyTheme(theme: "light" | "dark") {
  document.body.setAttribute("data-theme", theme);
}

export const useConfigStore = create<ConfigState>((set, get) => {
  const initialTheme = resolveTheme(DEFAULT_CONFIG.theme);
  applyTheme(initialTheme);

  // 시스템 테마 변경 감지
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      const config = get().config;
      if (config.theme === "system") {
        const resolved = resolveTheme("system");
        applyTheme(resolved);
        set({ resolvedTheme: resolved });
      }
    });

  return {
    config: DEFAULT_CONFIG,
    resolvedTheme: initialTheme,

    initFromStorage: async () => {
      const loaded = await loadPersistedConfig();
      if (!loaded) return;
      // 저장된 설정과 기본값 병합 (새 필드 대응)
      const merged = { ...DEFAULT_CONFIG, ...loaded };
      const resolved = resolveTheme(merged.theme);
      applyTheme(resolved);
      set({ config: merged, resolvedTheme: resolved });
    },

    setTheme: (mode) => {
      const resolved = resolveTheme(mode);
      applyTheme(resolved);
      const config = { ...get().config, theme: mode };
      set({ config, resolvedTheme: resolved });
      persistConfig(config);
    },

    setLocale: (locale) => {
      const config = { ...get().config, locale };
      set({ config });
      persistConfig(config);
    },

    setPreviewMode: (mode) => {
      const config = { ...get().config, previewMode: mode };
      set({ config });
      persistConfig(config);
    },

    setAutoSaveInterval: (interval) => {
      const config = { ...get().config, autoSaveInterval: interval };
      set({ config });
      persistConfig(config);
    },

    updateConfig: (updates) => {
      const config = { ...get().config, ...updates };
      set({ config });
      persistConfig(config);
    },
  };
});
