import { create } from "zustand";
import type { ProjectFile, Document, Layer, ViewSettings, Namespace } from "../types/project";
import type { DragState, LayerClipboard } from "../types/editor";
import { t } from "../i18n";

const MAX_UNDO = 50;

interface UndoSnapshot {
  layers: Layer[];
  activeLayerId: number | null;
  selectedLayerIds: number[];
  nextLayerId: number;
}

export type EditorMode = "normal" | "opaquePaint" | "opaqueErase";

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
  canvasSize: { width: number; height: number };
  setCanvasSize: (size: { width: number; height: number }) => void;

  // 네임스페이스 관리
  createNamespace: (name?: string) => Namespace;
  switchNamespace: (nsId: number) => void;
  closeNamespace: (nsId: number) => void;
  renameNamespace: (nsId: number, name: string) => void;
  reorderNamespaces: (fromIndex: number, toIndex: number) => void;
  moveDocToNamespace: (docId: number, nsId: number) => void;

  // 문서 관리
  createDocument: (name?: string) => Document;
  switchDocument: (docId: number) => void;
  closeDocument: (docId: number) => void;
  renameDocument: (docId: number, name: string) => void;
  reorderDocuments: (fromIndex: number, toIndex: number) => void;
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

  // 뷰/상태
  statusMessage: string;
  projectPath: string | null;
  lastSavedAt: string | null;

  // 에디터 모드
  editorMode: EditorMode;
  setEditorMode: (mode: EditorMode) => void;

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
  pushUndo: (snapshot: UndoSnapshot, clearRedo?: boolean) => void;
  popUndo: () => UndoSnapshot | null;
  popRedo: () => UndoSnapshot | null;
  pushRedo: (snapshot: UndoSnapshot) => void;
  clearUndoRedo: () => void;

  // 닫힌 문서/네임스페이스 복원
  closedDocStack: string[];
  reopenLastClosedDocument: () => void;
  closedNsStack: string[];
  reopenLastClosedNamespace: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: {
    version: 2,
    name: "Untitled Project",
    documents: [],
    activeDocId: -1,
    nextDocId: 0,
    namespaces: [],
    activeNamespaceId: -1,
    nextNamespaceId: 0,
  },
  layers: [],
  activeLayerId: null,
  selectedLayerIds: new Set(),
  nextLayerId: 0,
  viewSettings: { snapEnabled: true, gridVisible: true, charGridEnabled: false },
  canvasSize: { width: 600, height: 500 },
  setCanvasSize: (size) => set({ canvasSize: size }),

  // ── 네임스페이스 관리 ──

  createNamespace: (name = "Namespace") => {
    const state = get();
    const nsId = state.project.nextNamespaceId;
    const docId = state.project.nextDocId;
    const doc = createDefaultDoc(docId, "문서 1");
    const ns: Namespace = { id: nsId, name, docIds: [docId] };
    get().saveCurrentDocState();
    set({
      project: {
        ...state.project,
        namespaces: [...state.project.namespaces, ns],
        documents: [...state.project.documents, doc],
        nextNamespaceId: nsId + 1,
        nextDocId: docId + 1,
        activeNamespaceId: nsId,
        activeDocId: docId,
      },
    });
    get().restoreDocState();
    return ns;
  },

  switchNamespace: (nsId) => {
    get().saveCurrentDocState();
    const state = get();
    const ns = state.project.namespaces.find((n) => n.id === nsId);
    if (!ns) return;
    set({ project: { ...state.project, activeNamespaceId: nsId } });
    if (ns.docIds.length > 0) {
      const firstDocId = ns.docIds[0];
      set({ project: { ...get().project, activeDocId: firstDocId } });
      get().restoreDocState();
    }
  },

  closeNamespace: (nsId) => {
    const state = get();
    if (state.project.namespaces.length <= 1) return;
    const ns = state.project.namespaces.find((n) => n.id === nsId);
    if (!ns) return;

    // 현재 문서 상태를 먼저 저장
    get().saveCurrentDocState();

    // 닫힌 네임스페이스+문서를 스택에 보관 (saveCurrentDocState 후 최신 상태)
    const closedDocs = get().project.documents.filter((d) => ns.docIds.includes(d.id));
    const entry = JSON.stringify({ namespace: ns, documents: closedDocs });
    const nsStack = [...get().closedNsStack, entry];
    if (nsStack.length > 10) nsStack.shift();
    set({ closedNsStack: nsStack });

    // 내부 문서 삭제
    const docs = state.project.documents.filter((d) => !ns.docIds.includes(d.id));
    const namespaces = state.project.namespaces.filter((n) => n.id !== nsId);
    let activeNsId = state.project.activeNamespaceId;
    let activeDocId = state.project.activeDocId;
    if (activeNsId === nsId) {
      activeNsId = namespaces[0].id;
      const newNs = namespaces[0];
      activeDocId = newNs.docIds.length > 0 ? newNs.docIds[0] : -1;
    }
    set({ project: { ...state.project, documents: docs, namespaces, activeNamespaceId: activeNsId, activeDocId } });
    if (state.project.activeNamespaceId === nsId) {
      get().restoreDocState();
    }
  },

  renameNamespace: (nsId, name) => {
    const state = get();
    const namespaces = state.project.namespaces.map((n) =>
      n.id === nsId ? { ...n, name } : n
    );
    set({ project: { ...state.project, namespaces } });
  },

  reorderNamespaces: (fromIndex, toIndex) => {
    const state = get();
    const namespaces = [...state.project.namespaces];
    const [moved] = namespaces.splice(fromIndex, 1);
    namespaces.splice(toIndex, 0, moved);
    set({ project: { ...state.project, namespaces } });
  },

  moveDocToNamespace: (docId, nsId) => {
    const state = get();
    // 원래 네임스페이스에 문서가 1개뿐이면 이동 거부
    const sourceNs = state.project.namespaces.find((n) => n.docIds.includes(docId));
    if (sourceNs && sourceNs.docIds.length <= 1) return;
    const namespaces = state.project.namespaces.map((n) => ({
      ...n,
      docIds: n.docIds.filter((id) => id !== docId),
    }));
    const target = namespaces.find((n) => n.id === nsId);
    if (target) target.docIds.push(docId);
    set({ project: { ...state.project, namespaces } });
  },

  // ── 문서 관리 ──

  createDocument: (name = "새 문서") => {
    const state = get();
    const id = state.project.nextDocId;
    const doc = createDefaultDoc(id, name);
    // 활성 네임스페이스에 문서 추가
    const namespaces = state.project.namespaces.map((n) =>
      n.id === state.project.activeNamespaceId
        ? { ...n, docIds: [...n.docIds, id] }
        : n
    );
    set({
      project: {
        ...state.project,
        documents: [...state.project.documents, doc],
        namespaces,
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
    // 네임스페이스에 마지막 문서면 닫기 거부
    const ownerNs = state.project.namespaces.find((n) => n.docIds.includes(docId));
    if (ownerNs && ownerNs.docIds.length <= 1) return;

    // 닫기 전 현재 문서 상태 저장
    get().saveCurrentDocState();

    // 닫힌 문서를 스택에 보관
    const closedDoc = get().project.documents.find((d) => d.id === docId);
    if (closedDoc) {
      const stack = [...get().closedDocStack, JSON.stringify(closedDoc)];
      if (stack.length > 20) stack.shift();
      set({ closedDocStack: stack });
    }

    const docs = state.project.documents.filter((d) => d.id !== docId);
    const namespaces = state.project.namespaces.map((n) => ({
      ...n,
      docIds: n.docIds.filter((id) => id !== docId),
    }));
    let activeDocId = state.project.activeDocId;
    if (activeDocId === docId) {
      // 같은 네임스페이스 내에서 왼쪽(이전) 문서 선택
      const activeNs = namespaces.find((n) => n.id === state.project.activeNamespaceId);
      if (activeNs && activeNs.docIds.length > 0) {
        // 삭제 전 네임스페이스에서의 인덱스를 기준으로 왼쪽 문서 선택
        const oldNs = state.project.namespaces.find((n) => n.id === state.project.activeNamespaceId);
        const oldIdx = oldNs ? oldNs.docIds.indexOf(docId) : 0;
        const newIdx = Math.max(0, Math.min(oldIdx - 1, activeNs.docIds.length - 1));
        activeDocId = activeNs.docIds[newIdx];
      } else {
        activeDocId = docs[0]?.id ?? -1;
      }
    }
    set({ project: { ...state.project, documents: docs, namespaces, activeDocId } });
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

  reorderDocuments: (fromIndex, toIndex) => {
    const state = get();
    const docs = [...state.project.documents];
    const [moved] = docs.splice(fromIndex, 1);
    docs.splice(toIndex, 0, moved);
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
      canvas: state.canvasSize,
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
      canvasSize: doc.canvas,
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
      opaqueRanges: opts.opaqueRanges ?? [],
    };
    set({
      layers: [...state.layers, layer],
      nextLayerId: id + 1,
      activeLayerId: id,
      selectedLayerIds: new Set([id]),
    });
    setStatus(`${t("layer.added")}: ${layer.name}`);
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
    setStatus(t("layer.deleted"));
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

  // 상태 표시
  statusMessage: "Ready",
  projectPath: null,
  lastSavedAt: null,

  // 에디터 모드
  editorMode: "normal" as EditorMode,
  setEditorMode: (mode) => set({ editorMode: mode }),

  // 드래그
  dragState: null,
  isDraggingLayer: false,
  setDragState: (state) => set({ dragState: state }),
  setIsDraggingLayer: (v) => set({ isDraggingLayer: v }),

  // 클립보드
  layerClipboard: [],
  docClipboard: null,
  tabBarFocused: false,
  setLayerClipboard: (v) => set({ layerClipboard: v }),
  setDocClipboard: (v) => set({ docClipboard: v }),
  setTabBarFocused: (v) => set({ tabBarFocused: v }),

  // Undo/Redo
  undoStack: [],
  redoStack: [],
  pushUndo: (snapshot, clearRedo = true) => {
    const stack = [...get().undoStack, JSON.stringify(snapshot)];
    if (stack.length > MAX_UNDO) stack.shift();
    set(clearRedo ? { undoStack: stack, redoStack: [] } : { undoStack: stack });
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

  // 닫힌 문서 복원
  closedDocStack: [],
  reopenLastClosedDocument: () => {
    const stack = [...get().closedDocStack];
    if (stack.length === 0) return;
    const json = stack.pop()!;
    set({ closedDocStack: stack });

    const doc: Document = JSON.parse(json);
    get().saveCurrentDocState();
    const state = get();
    // 활성 네임스페이스에 문서 추가
    const namespaces = state.project.namespaces.map((n) =>
      n.id === state.project.activeNamespaceId
        ? { ...n, docIds: [...n.docIds, doc.id] }
        : n
    );
    set({
      project: {
        ...state.project,
        documents: [...state.project.documents, doc],
        namespaces,
        activeDocId: doc.id,
      },
    });
    get().restoreDocState();
  },

  // 닫힌 네임스페이스 복원
  closedNsStack: [],
  reopenLastClosedNamespace: () => {
    const stack = [...get().closedNsStack];
    if (stack.length === 0) return;
    const json = stack.pop()!;
    set({ closedNsStack: stack });

    const { namespace, documents: closedDocs } = JSON.parse(json) as { namespace: Namespace; documents: Document[] };
    get().saveCurrentDocState();
    const state = get();
    set({
      project: {
        ...state.project,
        namespaces: [...state.project.namespaces, namespace],
        documents: [...state.project.documents, ...closedDocs],
        activeNamespaceId: namespace.id,
        activeDocId: namespace.docIds.length > 0 ? namespace.docIds[0] : state.project.activeDocId,
      },
    });
    get().restoreDocState();
  },
}))

/** 컴포넌트 밖에서 사용 */
export function setStatus(msg: string) {
  useProjectStore.setState({ statusMessage: msg });
}

export function setProjectPath(path: string | null) {
  useProjectStore.setState({ projectPath: path });
}

export function markSaved() {
  useProjectStore.setState({ lastSavedAt: new Date().toLocaleTimeString() });
}

/** 현재 상태를 스냅샷으로 캡처하여 undoStack에 push */
export function saveUndoSnapshot() {
  const { layers, activeLayerId, selectedLayerIds, nextLayerId, pushUndo } =
    useProjectStore.getState();
  pushUndo({
    layers: layers.map((l) => ({ ...l, opaqueRanges: l.opaqueRanges.map((r) => ({ ...r })) })),
    activeLayerId,
    selectedLayerIds: [...selectedLayerIds],
    nextLayerId,
  });
}
