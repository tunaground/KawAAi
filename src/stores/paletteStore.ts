import { create } from "zustand";
import type { PaletteSetFile, Palette, BoxPreset, StampPreset } from "../types/palette";

const STORAGE_KEY = "KawAAi_palette_set";

const DEFAULT_PALETTE_SET: PaletteSetFile = {
  version: 2,
  name: "기본 세트",
  palettes: [
    { name: "얼굴", type: "char", chars: ["∀", "´", "｀", "ω", "Д", "ﾟ", "д", "∇", "皿", "ー"] },
    { name: "괄호", type: "char", chars: ["（", "）", "「", "」", "『", "』", "【", "】", "＜", "＞"] },
    { name: "선/장식", type: "char", chars: ["━", "─", "│", "┃", "￣", "＿", "／", "＼", "∧", "∨"] },
    { name: "기호", type: "char", chars: ["☆", "★", "○", "●", "◎", "◇", "◆", "□", "■", "△"] },
    {
      name: "박스", type: "box", boxes: [
        { name: "기본", tl: "+", t: "-", tr: "+", l: "|", r: "|", bl: "+", b: "-", br: "+", paddingLeft: 0, paddingRight: 0 },
        { name: "이중선", tl: "┌", t: "─", tr: "┐", l: "│", r: "│", bl: "└", b: "─", br: "┘", paddingLeft: 0, paddingRight: 0 },
        { name: "둥근", tl: "╭", t: "─", tr: "╮", l: "│", r: "│", bl: "╰", b: "─", br: "╯", paddingLeft: 0, paddingRight: 0 },
      ],
    },
    { name: "스탬프", type: "stamp", stamps: [] },
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
      try { return JSON.parse(stored); } catch { /* ignore */ }
    }
  }
  return null;
}

/** v1 → v2 마이그레이션: type 필드 추가 */
function migratePaletteSet(data: PaletteSetFile): PaletteSetFile {
  if (data.version < 2) {
    data.version = 2;
    data.palettes = data.palettes.map((p: any) => {
      if (!p.type) return { ...p, type: "char" } as Palette;
      return p;
    });
  }
  // box padding 마이그레이션
  for (const p of data.palettes) {
    if (p.type === "box") {
      p.boxes = p.boxes.map((b: any) => ({
        ...b,
        paddingLeft: b.paddingLeft ?? b.padding ?? 0,
        paddingRight: b.paddingRight ?? b.padding ?? 0,
      }));
    }
  }
  return data;
}

interface PaletteState {
  paletteSet: PaletteSetFile;
  activePaletteIndex: number;
  selectedIndices: Set<number>;
  setSelectedIndices: (s: Set<number>) => void;
  clearSelection: () => void;
  initFromStorage: () => Promise<void>;
  setPaletteSet: (set: PaletteSetFile) => void;
  setActivePaletteIndex: (idx: number) => void;
  activePalette: () => Palette | null;

  // char palette actions
  addChar: (char: string) => void;
  removeChar: (idx: number) => void;

  // box palette actions
  addBox: (preset: BoxPreset) => void;
  updateBox: (idx: number, preset: BoxPreset) => void;
  removeBox: (idx: number) => void;

  // stamp palette actions
  addStamp: (preset: StampPreset) => void;
  updateStamp: (idx: number, preset: StampPreset) => void;
  removeStamp: (idx: number) => void;

  // palette management
  addPalette: (name: string, type: "char" | "box" | "stamp") => void;
  removePalette: (idx: number) => void;
}

export const usePaletteStore = create<PaletteState>((set, get) => ({
  paletteSet: DEFAULT_PALETTE_SET,
  activePaletteIndex: 0,
  selectedIndices: new Set<number>(),
  setSelectedIndices: (s) => set({ selectedIndices: s }),
  clearSelection: () => set({ selectedIndices: new Set() }),

  initFromStorage: async () => {
    const loaded = await loadPersistedPaletteSet();
    if (loaded) {
      set({ paletteSet: migratePaletteSet(loaded), activePaletteIndex: 0 });
    }
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

  // ── char actions ──
  addChar: (char) => {
    const s = get();
    const pal = s.paletteSet.palettes[s.activePaletteIndex];
    if (!pal || pal.type !== "char") return;
    const palettes = [...s.paletteSet.palettes];
    palettes[s.activePaletteIndex] = { ...pal, chars: [...pal.chars, char] };
    const updated = { ...s.paletteSet, palettes };
    set({ paletteSet: updated });
    persistPaletteSet(updated);
  },

  removeChar: (idx) => {
    const s = get();
    const pal = s.paletteSet.palettes[s.activePaletteIndex];
    if (!pal || pal.type !== "char") return;
    const palettes = [...s.paletteSet.palettes];
    palettes[s.activePaletteIndex] = { ...pal, chars: pal.chars.filter((_, i) => i !== idx) };
    const updated = { ...s.paletteSet, palettes };
    set({ paletteSet: updated });
    persistPaletteSet(updated);
  },

  // ── box actions ──
  addBox: (preset) => {
    const s = get();
    const pal = s.paletteSet.palettes[s.activePaletteIndex];
    if (!pal || pal.type !== "box") return;
    const palettes = [...s.paletteSet.palettes];
    palettes[s.activePaletteIndex] = { ...pal, boxes: [...pal.boxes, preset] };
    const updated = { ...s.paletteSet, palettes };
    set({ paletteSet: updated });
    persistPaletteSet(updated);
  },

  updateBox: (idx, preset) => {
    const s = get();
    const pal = s.paletteSet.palettes[s.activePaletteIndex];
    if (!pal || pal.type !== "box") return;
    const palettes = [...s.paletteSet.palettes];
    const boxes = [...pal.boxes];
    boxes[idx] = preset;
    palettes[s.activePaletteIndex] = { ...pal, boxes };
    const updated = { ...s.paletteSet, palettes };
    set({ paletteSet: updated });
    persistPaletteSet(updated);
  },

  removeBox: (idx) => {
    const s = get();
    const pal = s.paletteSet.palettes[s.activePaletteIndex];
    if (!pal || pal.type !== "box") return;
    const palettes = [...s.paletteSet.palettes];
    palettes[s.activePaletteIndex] = { ...pal, boxes: pal.boxes.filter((_, i) => i !== idx) };
    const updated = { ...s.paletteSet, palettes };
    set({ paletteSet: updated });
    persistPaletteSet(updated);
  },

  // ── stamp actions ──
  addStamp: (preset) => {
    const s = get();
    const pal = s.paletteSet.palettes[s.activePaletteIndex];
    if (!pal || pal.type !== "stamp") return;
    const palettes = [...s.paletteSet.palettes];
    palettes[s.activePaletteIndex] = { ...pal, stamps: [...pal.stamps, preset] };
    const updated = { ...s.paletteSet, palettes };
    set({ paletteSet: updated });
    persistPaletteSet(updated);
  },

  updateStamp: (idx, preset) => {
    const s = get();
    const pal = s.paletteSet.palettes[s.activePaletteIndex];
    if (!pal || pal.type !== "stamp") return;
    const palettes = [...s.paletteSet.palettes];
    const stamps = [...pal.stamps];
    stamps[idx] = preset;
    palettes[s.activePaletteIndex] = { ...pal, stamps };
    const updated = { ...s.paletteSet, palettes };
    set({ paletteSet: updated });
    persistPaletteSet(updated);
  },

  removeStamp: (idx) => {
    const s = get();
    const pal = s.paletteSet.palettes[s.activePaletteIndex];
    if (!pal || pal.type !== "stamp") return;
    const palettes = [...s.paletteSet.palettes];
    palettes[s.activePaletteIndex] = { ...pal, stamps: pal.stamps.filter((_, i) => i !== idx) };
    const updated = { ...s.paletteSet, palettes };
    set({ paletteSet: updated });
    persistPaletteSet(updated);
  },

  // ── palette management ──
  addPalette: (name, type) => {
    const s = get();
    const newPal: Palette = type === "stamp"
      ? { name, type: "stamp", stamps: [] }
      : type === "box"
      ? { name, type: "box", boxes: [] }
      : { name, type: "char", chars: [] };
    const palettes = [...s.paletteSet.palettes, newPal];
    const updated = { ...s.paletteSet, palettes };
    set({ paletteSet: updated, activePaletteIndex: palettes.length - 1 });
    persistPaletteSet(updated);
  },

  removePalette: (idx) => {
    const s = get();
    if (s.paletteSet.palettes.length <= 1) return;
    const palettes = s.paletteSet.palettes.filter((_, i) => i !== idx);
    const newIdx = Math.min(s.activePaletteIndex, palettes.length - 1);
    const updated = { ...s.paletteSet, palettes };
    set({ paletteSet: updated, activePaletteIndex: newIdx });
    persistPaletteSet(updated);
  },
}));
