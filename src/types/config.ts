/** AppConfig — app_config_dir/config.json에 저장 */
/** 자동 저장 간격 (초). 0 = 안함 */
export type AutoSaveInterval = 0 | 30 | 60 | 180 | 300 | 600;

export interface AppConfig {
  locale: "system" | "ko" | "ja" | "en";
  theme: "system" | "light" | "dark";
  autoSaveInterval: AutoSaveInterval;
  paletteSetPath: string;
  mltDirPath: string;
  recentProjects: string[];
  previewMode: "right" | "bottom" | "detached";
  previewWindow: { x: number; y: number; width: number; height: number } | null;
}

export const DEFAULT_CONFIG: AppConfig = {
  locale: "system",
  theme: "system",
  autoSaveInterval: 60,
  paletteSetPath: "",
  mltDirPath: "",
  recentProjects: [],
  previewMode: "right",
  previewWindow: null,
};
