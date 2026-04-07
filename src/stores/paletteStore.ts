import { create } from "zustand";
import type { PaletteSetFile, Palette } from "../types/palette";

const STORAGE_KEY = "kawaii_palette_set";

const DEFAULT_PALETTE_SET: PaletteSetFile = {
  version: 1,
  name: "기본 세트",
  palettes: [
    { name: "얼굴", chars: ["∀", "´", "｀", "ω", "Д", "ﾟ", "д", "∇", "皿", "ー"] },
    { name: "괄호", chars: ["（", "）", "「", "」", "『", "』", "【", "】", "＜", "＞"] },
    { name: "선/장식", chars: ["━", "─", "│", "┃", "￣", "＿", "／", "＼", "∧", "∨"] },
    { name: "기호", chars: ["☆", "★", "○", "●", "◎", "◇", "◆", "□", "■", "△"] },
  ],
};

/** 저장: Tauri → .aapals 파일 / 웹 → localStorage */
async function persistPaletteSet(ps: PaletteSetFile) {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("save_palette_set", { data: ps });
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ps));
  }
}

/** 로드: Tauri → .aapals 파일 / 웹 → localStorage */
async function loadPersistedPaletteSet(): Promise<PaletteSetFile | null> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const data = await invoke<PaletteSetFile | null>("load_palette_set");
    if (data && data.palettes) return data;
  } catch {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { return JSON.parse(stored); } catch {}
    }
  }
  return null;
}

interface PaletteState {
  paletteSet: PaletteSetFile;
  activePaletteIndex: number;
  initFromStorage: () => Promise<void>;
  setPaletteSet: (set: PaletteSetFile) => void;
  setActivePaletteIndex: (idx: number) => void;
  activePalette: () => Palette | null;
  addChar: (char: string) => void;
  removeChar: (idx: number) => void;
  addPalette: (name: string) => void;
  removePalette: (idx: number) => void;
}

export const usePaletteStore = create<PaletteState>((set, get) => ({
  paletteSet: DEFAULT_PALETTE_SET,
  activePaletteIndex: 0,

  initFromStorage: async () => {
    const loaded = await loadPersistedPaletteSet();
    if (loaded) set({ paletteSet: loaded, activePaletteIndex: 0 });
  },

  setPaletteSet: (paletteSet) => {
    set({ paletteSet, activePaletteIndex: 0 });
    persistPaletteSet(paletteSet);
  },

  setActivePaletteIndex: (idx) => set({ activePaletteIndex: idx }),

  activePalette: () => {
    const s = get();
    return s.paletteSet.palettes[s.activePaletteIndex] ?? null;
  },

  addChar: (char) => {
    const s = get();
    const palettes = [...s.paletteSet.palettes];
    const p = { ...palettes[s.activePaletteIndex] };
    p.chars = [...p.chars, char];
    palettes[s.activePaletteIndex] = p;
    const updated = { ...s.paletteSet, palettes };
    set({ paletteSet: updated });
    persistPaletteSet(updated);
  },

  removeChar: (idx) => {
    const s = get();
    const palettes = [...s.paletteSet.palettes];
    const p = { ...palettes[s.activePaletteIndex] };
    p.chars = p.chars.filter((_, i) => i !== idx);
    palettes[s.activePaletteIndex] = p;
    const updated = { ...s.paletteSet, palettes };
    set({ paletteSet: updated });
    persistPaletteSet(updated);
  },

  addPalette: (name) => {
    const s = get();
    const palettes = [...s.paletteSet.palettes, { name, chars: [] }];
    const updated = { ...s.paletteSet, palettes };
    set({
      paletteSet: updated,
      activePaletteIndex: palettes.length - 1,
    });
    persistPaletteSet(updated);
  },

  removePalette: (idx) => {
    const s = get();
    if (s.paletteSet.palettes.length <= 1) return; // 최소 1개 유지
    const palettes = s.paletteSet.palettes.filter((_, i) => i !== idx);
    const newIdx = Math.min(s.activePaletteIndex, palettes.length - 1);
    const updated = { ...s.paletteSet, palettes };
    set({ paletteSet: updated, activePaletteIndex: newIdx });
    persistPaletteSet(updated);
  },
}));
