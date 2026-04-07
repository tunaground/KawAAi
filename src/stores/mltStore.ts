import { create } from "zustand";
import { parseMLT, type MltEntry } from "../lib/mltParser";

const STORAGE_KEY = "KawAAi_mlt_dir";

interface MltState {
  dirPath: string;
  files: { name: string; path: string }[];
  currentFileIndex: number;
  entries: MltEntry[];
  sections: { name: string; startIdx: number; endIdx: number }[];
  currentSectionIndex: number;

  setDirPath: (path: string) => void;
  setFiles: (files: { name: string; path: string }[]) => void;
  loadFileContent: (index: number, content: string) => void;
  setCurrentSection: (index: number) => void;
  clear: () => void;

  /** 앱 시작 시 저장된 디렉토리 경로로 자동 로드 (Tauri 전용) */
  initFromStorage: () => Promise<void>;
  /** Tauri 환경에서 디렉토리 경로로 파일 목록 로드 */
  loadDir: (dir: string) => Promise<void>;
}

function buildSections(entries: MltEntry[]) {
  // 섹션 헤더(isSection=true)를 기준으로 분할
  const sectionIndices: number[] = [];
  entries.forEach((e, i) => { if (e.isSection) sectionIndices.push(i); });

  if (sectionIndices.length === 0) {
    // 섹션 헤더 없음 → 단일 섹션
    return [{ name: "All", startIdx: 0, endIdx: entries.length }];
  }

  const sections: { name: string; startIdx: number; endIdx: number }[] = [];
  for (let i = 0; i < sectionIndices.length; i++) {
    const idx = sectionIndices[i];
    const nextIdx = i + 1 < sectionIndices.length ? sectionIndices[i + 1] : entries.length;
    // 섹션 헤더 다음 항목부터 다음 섹션 헤더 전까지
    const startIdx = idx + 1;
    if (startIdx >= nextIdx) continue; // 빈 섹션 스킵
    sections.push({
      name: entries[idx].name || `#${idx + 1}`,
      startIdx,
      endIdx: nextIdx,
    });
  }

  // 첫 번째 섹션 헤더 이전에 항목이 있으면 선두 섹션으로
  if (sectionIndices[0] > 0) {
    sections.unshift({
      name: entries[0].isSection ? entries[0].name : "—",
      startIdx: entries[0].isSection ? 1 : 0,
      endIdx: sectionIndices[0],
    });
  }

  return sections.length > 0 ? sections : [{ name: "All", startIdx: 0, endIdx: entries.length }];
}

/** 디렉토리 경로 저장 */
async function persistDirPath(path: string) {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    // config에 저장
    let config: any = {};
    try { config = await invoke("load_config") ?? {}; } catch {}
    config.mltDirPath = path;
    await invoke("save_config", { data: config });
  } catch {
    localStorage.setItem(STORAGE_KEY, path);
  }
}

/** 저장된 디렉토리 경로 가져오기 */
async function getPersistedDirPath(): Promise<string | null> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const config: any = await invoke("load_config");
    return config?.mltDirPath || null;
  } catch {
    return localStorage.getItem(STORAGE_KEY);
  }
}

export const useMltStore = create<MltState>((set, get) => ({
  dirPath: "",
  files: [],
  currentFileIndex: -1,
  entries: [],
  sections: [],
  currentSectionIndex: 0,

  setDirPath: (path) => set({ dirPath: path }),

  setFiles: (files) => set({ files, currentFileIndex: -1, entries: [], sections: [] }),

  loadFileContent: (index, content) => {
    const entries = parseMLT(content);
    const sections = buildSections(entries);
    set({ currentFileIndex: index, entries, sections, currentSectionIndex: 0 });
  },

  setCurrentSection: (index) => set({ currentSectionIndex: index }),

  clear: () => set({ dirPath: "", files: [], currentFileIndex: -1, entries: [], sections: [], currentSectionIndex: 0 }),

  loadDir: async (dir) => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const paths = await invoke<string[]>("list_mlt_files", { dir });
      if (paths.length === 0) return;

      const mltFiles = paths.map((p) => ({
        name: p.split("/").pop()!.split("\\").pop()!,
        path: p,
      }));

      set({ dirPath: dir, files: mltFiles });
      await persistDirPath(dir);

      // 첫 파일 로드
      const content = await invoke<string>("read_mlt_file", { path: mltFiles[0].path });
      get().loadFileContent(0, content);
    } catch {}
  },

  initFromStorage: async () => {
    const dir = await getPersistedDirPath();
    if (!dir) return;
    await get().loadDir(dir);
  },
}));
