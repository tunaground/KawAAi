import { create } from "zustand";
import type { ProjectFile, Document, Layer, ViewSettings } from "../types/project";
import { setStatus } from "./statusStore";

const LAYER_COLORS = [
  "#2196f3", "#4caf50", "#ff9800", "#e91e63",
  "#9c27b0", "#00bcd4", "#ff5722", "#8bc34a",
];

function createDefaultDoc(id: number, name = "새 문서"): Document {
  return {
    id,
    name,
    canvas: { width: 600, height: 500 },
    layers: [],
    activeLayerId: null,
    nextLayerId: 0,
    viewSettings: { snapEnabled: true, gridVisible: true, charGridEnabled: false },
  };
}

interface ProjectState {
  project: ProjectFile;
  // 현재 활성 문서의 라이브 참조
  layers: Layer[];
  activeLayerId: number | null;
  selectedLayerIds: Set<number>;
  nextLayerId: number;
  viewSettings: ViewSettings;

  // 문서 관리
  createDocument: (name?: string) => Document;
  switchDocument: (docId: number) => void;
  closeDocument: (docId: number) => void;
  renameDocument: (docId: number, name: string) => void;
  saveCurrentDocState: () => void;
  restoreDocState: () => void;

  // 레이어 관리
  createLayer: (text: string, x: number, y: number, w: number, h: number, opts?: Partial<Layer>) => Layer;
  removeLayer: (id: number) => void;
  updateLayer: (id: number, updates: Partial<Layer>) => void;
  setActiveLayer: (id: number | null, modifier?: "ctrl" | "shift" | null) => void;
  moveLayerOrder: (movedIds: Set<number>, targetId: number, position: "above" | "below") => void;
  reorderLayers: (newLayers: Layer[]) => void;

  // 뷰 설정
  setViewSetting: <K extends keyof ViewSettings>(key: K, value: ViewSettings[K]) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: {
    version: 1,
    name: "Untitled Project",
    documents: [],
    activeDocId: -1,
    nextDocId: 0,
  },
  layers: [],
  activeLayerId: null,
  selectedLayerIds: new Set(),
  nextLayerId: 0,
  viewSettings: { snapEnabled: true, gridVisible: true, charGridEnabled: false },

  createDocument: (name = "새 문서") => {
    const state = get();
    const id = state.project.nextDocId;
    const doc = createDefaultDoc(id, name);
    set({
      project: {
        ...state.project,
        documents: [...state.project.documents, doc],
        nextDocId: id + 1,
      },
    });
    return doc;
  },

  switchDocument: (docId) => {
    // 현재 문서 상태를 먼저 저장한 후 전환
    get().saveCurrentDocState();
    const updatedProject = get().project;
    set({ project: { ...updatedProject, activeDocId: docId } });
    get().restoreDocState();
  },

  closeDocument: (docId) => {
    const state = get();
    if (state.project.documents.length <= 1) return;
    const docs = state.project.documents.filter((d) => d.id !== docId);
    let activeDocId = state.project.activeDocId;
    if (activeDocId === docId) {
      const idx = state.project.documents.findIndex((d) => d.id === docId);
      const newIdx = Math.min(idx, docs.length - 1);
      activeDocId = docs[newIdx].id;
    }
    set({ project: { ...state.project, documents: docs, activeDocId } });
    if (state.project.activeDocId === docId) {
      get().restoreDocState();
    }
  },

  renameDocument: (docId, name) => {
    const state = get();
    const docs = state.project.documents.map((d) =>
      d.id === docId ? { ...d, name } : d
    );
    set({ project: { ...state.project, documents: docs } });
  },

  saveCurrentDocState: () => {
    const state = get();
    const doc = state.project.documents.find(
      (d) => d.id === state.project.activeDocId
    );
    if (!doc) return;

    const updated: Document = {
      ...doc,
      layers: state.layers,
      activeLayerId: state.activeLayerId,
      nextLayerId: state.nextLayerId,
      viewSettings: state.viewSettings,
    };
    const docs = state.project.documents.map((d) =>
      d.id === doc.id ? updated : d
    );
    set({ project: { ...state.project, documents: docs } });
  },

  restoreDocState: () => {
    const state = get();
    const doc = state.project.documents.find(
      (d) => d.id === state.project.activeDocId
    );
    if (!doc) return;
    set({
      layers: doc.layers,
      activeLayerId: doc.activeLayerId,
      selectedLayerIds: doc.activeLayerId !== null ? new Set([doc.activeLayerId]) : new Set(),
      nextLayerId: doc.nextLayerId,
      viewSettings: doc.viewSettings,
    });
  },

  createLayer: (text, x, y, w, h, opts = {}) => {
    const state = get();
    const id = state.nextLayerId;
    const type = opts.type ?? "text";
    const layer: Layer = {
      id,
      type,
      name: opts.name ?? (type === "image" ? `Image ${id}` : `Layer ${id}`),
      text: type === "text" ? text : "",
      x, y, w, h,
      visible: true,
      locked: false,
      color: type === "image" ? "#ff9800" : LAYER_COLORS[id % LAYER_COLORS.length],
      textColor: opts.textColor ?? "#000000",
      opacity: opts.opacity ?? (type === "image" ? 0.5 : 1),
      imageSrc: opts.imageSrc ?? "",
    };
    set({
      layers: [...state.layers, layer],
      nextLayerId: id + 1,
      activeLayerId: id,
      selectedLayerIds: new Set([id]),
    });
    setStatus(`레이어 추가됨: ${layer.name}`);
    return layer;
  },

  removeLayer: (id) => {
    const state = get();
    const newLayers = state.layers.filter((l) => l.id !== id);
    const newSelected = new Set(state.selectedLayerIds);
    newSelected.delete(id);
    let newActive = state.activeLayerId;
    if (newActive === id) {
      newActive = newLayers.length > 0 ? newLayers[newLayers.length - 1].id : null;
      newSelected.clear();
      if (newActive !== null) newSelected.add(newActive);
    }
    set({
      layers: newLayers,
      activeLayerId: newActive,
      selectedLayerIds: newSelected,
    });
    setStatus("레이어 삭제됨");
  },

  updateLayer: (id, updates) => {
    set({
      layers: get().layers.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    });
  },

  setActiveLayer: (id, modifier = null) => {
    if (id === null) {
      set({ activeLayerId: null, selectedLayerIds: new Set() });
      return;
    }
    const state = get();
    const newSelected = new Set(state.selectedLayerIds);

    if (modifier === "ctrl") {
      if (newSelected.has(id)) {
        newSelected.delete(id);
        const newActive = newSelected.size > 0
          ? [...newSelected][newSelected.size - 1]
          : null;
        set({ activeLayerId: newActive, selectedLayerIds: newSelected });
      } else {
        newSelected.add(id);
        set({ activeLayerId: id, selectedLayerIds: newSelected });
      }
    } else if (modifier === "shift" && state.activeLayerId !== null) {
      const activeIdx = state.layers.findIndex((l) => l.id === state.activeLayerId);
      const targetIdx = state.layers.findIndex((l) => l.id === id);
      if (activeIdx !== -1 && targetIdx !== -1) {
        const from = Math.min(activeIdx, targetIdx);
        const to = Math.max(activeIdx, targetIdx);
        for (let i = from; i <= to; i++) {
          newSelected.add(state.layers[i].id);
        }
      }
      set({ activeLayerId: id, selectedLayerIds: newSelected });
    } else {
      set({
        activeLayerId: id,
        selectedLayerIds: new Set([id]),
      });
    }
  },

  moveLayerOrder: (movedIds, targetId, position) => {
    const state = get();
    if (movedIds.has(targetId)) return;
    const moved = state.layers.filter((l) => movedIds.has(l.id));
    const remaining = state.layers.filter((l) => !movedIds.has(l.id));
    const dstIdx = remaining.findIndex((l) => l.id === targetId);
    if (dstIdx === -1) return;
    const insertAt = position === "above" ? dstIdx + 1 : dstIdx;
    remaining.splice(insertAt, 0, ...moved);
    set({ layers: remaining });
  },

  reorderLayers: (newLayers) => {
    set({ layers: newLayers });
  },

  setViewSetting: (key, value) => {
    set({ viewSettings: { ...get().viewSettings, [key]: value } });
  },
}));
