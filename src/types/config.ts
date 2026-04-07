/** AppConfig — app_config_dir/config.json에 저장 */
/** 자동 저장 간격 (초). 0 = 안함 */
export type AutoSaveInterval = 0 | 30 | 60 | 180 | 300 | 600;

export interface WindowLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PanelLayout {
  leftPanelWidth: number;
  previewPanelWidth: number;
}

export interface AppConfig {
  locale: "system" | "ko" | "ja" | "en";
  theme: "system" | "light" | "dark";
  autoSaveInterval: AutoSaveInterval;
  paletteSetPath: string;
  mltDirPath: string;
  recentProjects: string[];
  previewMode: "right" | "bottom" | "detached";
  previewWindow: WindowLayout | null;
  windowLayout: WindowLayout | null;
  panelLayout: PanelLayout | null;
  sectionsCollapsed: { layers: boolean; palette: boolean; library: boolean } | null;
  sectionHeights: { layers: number; palette: number; library: number } | null;
  activePaletteIndex: number;
  mltFileIndex: number;
  mltSectionIndex: number;
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
  windowLayout: null,
  panelLayout: null,
  sectionsCollapsed: null,
  sectionHeights: null,
  activePaletteIndex: 0,
  mltFileIndex: 0,
  mltSectionIndex: 0,
};
