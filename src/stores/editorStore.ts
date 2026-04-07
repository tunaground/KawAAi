import { create } from "zustand";
import type { DragState, LayerClipboard } from "../types/editor";
import type { Layer } from "../types/project";

const MAX_UNDO = 50;

interface UndoSnapshot {
  layers: Layer[];
  activeLayerId: number | null;
  selectedLayerIds: number[];
  nextLayerId: number;
}

interface EditorState {
  // 드래그
  dragState: DragState | null;
  isDraggingLayer: boolean;
  setDragState: (state: DragState | null) => void;
  setIsDraggingLayer: (v: boolean) => void;

  // 클립보드
  layerClipboard: LayerClipboard[];
  docClipboard: object | null;
  tabBarFocused: boolean;
  setLayerClipboard: (v: LayerClipboard[]) => void;
  setDocClipboard: (v: object | null) => void;
  setTabBarFocused: (v: boolean) => void;

  // Undo/Redo
  undoStack: string[];
  redoStack: string[];
  pushUndo: (snapshot: UndoSnapshot) => void;
  popUndo: () => UndoSnapshot | null;
  popRedo: () => UndoSnapshot | null;
  pushRedo: (snapshot: UndoSnapshot) => void;
  clearUndoRedo: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  dragState: null,
  isDraggingLayer: false,
  setDragState: (state) => set({ dragState: state }),
  setIsDraggingLayer: (v) => set({ isDraggingLayer: v }),

  layerClipboard: [],
  docClipboard: null,
  tabBarFocused: false,
  setLayerClipboard: (v) => set({ layerClipboard: v }),
  setDocClipboard: (v) => set({ docClipboard: v }),
  setTabBarFocused: (v) => set({ tabBarFocused: v }),

  undoStack: [],
  redoStack: [],
  pushUndo: (snapshot) => {
    const stack = [...get().undoStack, JSON.stringify(snapshot)];
    if (stack.length > MAX_UNDO) stack.shift();
    set({ undoStack: stack, redoStack: [] });
  },
  popUndo: () => {
    const stack = [...get().undoStack];
    if (stack.length === 0) return null;
    const json = stack.pop()!;
    set({ undoStack: stack });
    return JSON.parse(json);
  },
  popRedo: () => {
    const stack = [...get().redoStack];
    if (stack.length === 0) return null;
    const json = stack.pop()!;
    set({ redoStack: stack });
    return JSON.parse(json);
  },
  pushRedo: (snapshot) => {
    set({ redoStack: [...get().redoStack, JSON.stringify(snapshot)] });
  },
  clearUndoRedo: () => set({ undoStack: [], redoStack: [] }),
}));
