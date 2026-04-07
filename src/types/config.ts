/** AppConfig — app_config_dir/config.json에 저장 */
export interface AppConfig {
  locale: "system" | "ko" | "ja" | "en";
  theme: "system" | "light" | "dark";
  paletteSetPath: string;
  mltDirPath: string;
  recentProjects: string[];
  previewMode: "right" | "bottom" | "detached";
  previewWindow: { x: number; y: number; width: number; height: number } | null;
}

export const DEFAULT_CONFIG: AppConfig = {
  locale: "system",
  theme: "system",
  paletteSetPath: "",
  mltDirPath: "",
  recentProjects: [],
  previewMode: "right",
  previewWindow: null,
};
