import { useEffect, useCallback } from "react";
import { useProjectStore, setStatus, saveUndoSnapshot } from "../stores/projectStore";
import { usePaletteStore } from "../stores/paletteStore";
import { t } from "../i18n";
import type { LayerClipboard } from "../types/editor";

/**
 * 전역 키보드 단축키.
 * POC의 모든 단축키를 포함:
 *   Ctrl+Z          — Undo
 *   Ctrl+Shift+Z    — Redo
 *   Ctrl+Y          — Redo
 *   Ctrl+C          — 레이어 복사 (textarea 밖) / 문서 복사 (탭 포커스)
 *   Ctrl+V          — 레이어 붙여넣기 / 문서 붙여넣기
 *   Escape          — 선택 해제
 *
 * Ctrl+S/O/Shift+S는 App.tsx에서 별도 처리 (파일 I/O 콜백 필요).
 */
export function useKeyboardShortcuts() {
  const handler = useCallback((e: KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey;
    const target = e.target as HTMLElement;
    const inTextarea = target.tagName === "TEXTAREA" || target.tagName === "INPUT";

    // Undo: Ctrl+Z (textarea 안에서도 동작)
    if (mod && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      undo();
      return;
    }

    // Redo: Ctrl+Shift+Z 또는 Ctrl+Y
    if (mod && e.key === "z" && e.shiftKey) {
      e.preventDefault();
      redo();
      return;
    }
    if (mod && e.key === "y") {
      e.preventDefault();
      redo();
      return;
    }

    // Escape: 박스활성 해제 → 팔레트선택 해제 → 블록선택 해제 → 모드 해제 → 레이어 선택 해제
    if (e.key === "Escape") {
      const store = useProjectStore.getState();
      const palStore = usePaletteStore.getState();
      if (store.activeBoxPreset || store.activeStampPreset || palStore.selectedIndices.size > 0) {
        store.setActiveBoxPreset(null);
        store.setActiveStampPreset(null);
        palStore.clearSelection();
      } else if (store.editorMode === "blockSelect" && store.blockSelection.length > 0) {
        store.clearBlockSelection();
      } else if (store.editorMode !== "normal") {
        store.setEditorMode("normal");
      } else {
        store.setActiveLayer(null);
      }
      return;
    }

    // Delete: 선택된 레이어 삭제 (textarea 편집 중이 아닐 때)
    if ((e.key === "Delete" || e.key === "Backspace") && !inTextarea) {
      const store = useProjectStore.getState();
      const ids = store.selectedLayerIds;
      if (ids.size > 0) {
        e.preventDefault();
        saveUndoSnapshot();
        for (const id of [...ids]) store.removeLayer(id);
      }
      return;
    }

    // Copy/Paste
    // textarea 안에서 텍스트 선택 중이면 일반 텍스트 복사에 맡김
    // 선택 영역 없으면 레이어 복사/붙여넣기로 처리
    if (mod && (e.key === "c" || e.key === "v")) {
      // 붙여넣기: textarea/input 안이면 항상 브라우저 기본 동작에 맡김
      if (e.key === "v" && inTextarea) return;

      // 복사: textarea에서 텍스트 선택 중이면 브라우저 기본 동작에 맡김
      const hasTextSelection =
        inTextarea &&
        target instanceof HTMLTextAreaElement &&
        target.selectionStart !== target.selectionEnd;

      if (hasTextSelection) return;

      e.preventDefault();
      const tabFocused = useProjectStore.getState().tabBarFocused;

      if (e.key === "c") {
        if (tabFocused) {
          copyDocument();
        } else {
          copyLayers();
        }
      } else {
        const docClip = useProjectStore.getState().docClipboard;
        if (tabFocused && docClip) {
          pasteDocument();
        } else {
          pasteLayers();
        }
      }
      return;
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handler]);
}

// ── Undo/Redo ──

function captureSnapshot() {
  const s = useProjectStore.getState();
  return {
    layers: s.layers.map((l) => ({ ...l, opaqueRanges: l.opaqueRanges.map((r) => ({ ...r })) })),
    activeLayerId: s.activeLayerId,
    selectedLayerIds: [...s.selectedLayerIds],
    nextLayerId: s.nextLayerId,
  };
}

function restoreSnapshot(snap: ReturnType<typeof captureSnapshot>) {
  useProjectStore.setState({
    layers: snap.layers,
    activeLayerId: snap.activeLayerId,
    selectedLayerIds: new Set(snap.selectedLayerIds),
    nextLayerId: snap.nextLayerId,
  });
}

function undo() {
  const editor = useProjectStore.getState();
  const snap = editor.popUndo();
  if (!snap) { setStatus(t("status.cannotUndo")); return; }
  editor.pushRedo(captureSnapshot());
  restoreSnapshot(snap);
  setStatus(t("status.undo"));
}

function redo() {
  const editor = useProjectStore.getState();
  const snap = editor.popRedo();
  if (!snap) { setStatus(t("status.cannotRedo")); return; }
  editor.pushUndo(captureSnapshot(), false);
  restoreSnapshot(snap);
  setStatus(t("status.redo"));
}

// ── Layer Copy/Paste ──

function copyLayers() {
  const s = useProjectStore.getState();
  // selectedLayerIds가 비어있으면 activeLayerId로 폴백
  let ids = s.selectedLayerIds;
  if (ids.size === 0 && s.activeLayerId !== null) {
    ids = new Set([s.activeLayerId]);
  }
  if (ids.size === 0) return;
  const clipboard: LayerClipboard[] = s.layers
    .filter((l) => ids.has(l.id))
    .map((l) => ({
      name: l.name,
      type: l.type,
      text: l.text,
      x: l.x,
      y: l.y,
      w: l.w,
      h: l.h,
      textColor: l.textColor,
      opacity: l.opacity,
      imageSrc: l.imageSrc,
      saturation: l.saturation,
      opaqueRanges: [...l.opaqueRanges],
    }));
  useProjectStore.getState().setLayerClipboard(clipboard);
  setStatus(`${clipboard.length}${t("layer.copied")}`);
}

function pasteLayers() {
  const clipboard = useProjectStore.getState().layerClipboard;
  if (clipboard.length === 0) return;

  saveUndoSnapshot();

  const state = useProjectStore.getState();
  const offset = useProjectStore.getState().lineHeight;
  const LAYER_COLORS = ["#2196f3", "#4caf50", "#ff9800", "#e91e63", "#9c27b0", "#00bcd4", "#ff5722", "#8bc34a"];
  const newLayers: typeof state.layers = [];
  const newSelected = new Set<number>();
  let nextId = state.nextLayerId;

  clipboard.forEach((lc) => {
    const id = nextId++;
    newLayers.push({
      id,
      name: lc.name + " copy",
      type: lc.type,
      text: lc.text,
      x: lc.x + offset,
      y: lc.y + offset,
      w: lc.w,
      h: lc.h,
      visible: true,
      locked: false,
      color: lc.type === "image" ? "#ff9800" : LAYER_COLORS[id % LAYER_COLORS.length],
      textColor: lc.textColor,
      opacity: lc.opacity,
      imageSrc: lc.imageSrc,
      saturation: lc.saturation,
      opaqueRanges: lc.opaqueRanges.map((r) => ({ ...r })),
    });
    newSelected.add(id);
  });

  useProjectStore.setState({
    layers: [...state.layers, ...newLayers],
    nextLayerId: nextId,
    activeLayerId: newLayers[newLayers.length - 1].id,
    selectedLayerIds: newSelected,
  });
  setStatus(`${clipboard.length}${t("layer.pasted")}`);
}

// ── Document Copy/Paste ──

function copyDocument() {
  useProjectStore.getState().saveCurrentDocState();
  const store = useProjectStore.getState();
  const doc = store.project.documents.find(
    (d) => d.id === store.project.activeDocId
  );
  if (!doc) return;
  const clip = JSON.parse(JSON.stringify(doc));
  delete clip.id;
  useProjectStore.getState().setDocClipboard(clip);
  setStatus(`${t("status.docCopied")}: ${doc.name}`);
}

function pasteDocument() {
  const clip = useProjectStore.getState().docClipboard as any;
  if (!clip) return;

  const store = useProjectStore.getState();
  store.saveCurrentDocState();
  const newDoc = store.createDocument(clip.name + " copy");
  // Copy data into new doc
  const docs = useProjectStore.getState().project.documents.map((d) =>
    d.id === newDoc.id
      ? {
          ...d,
          canvas: { ...clip.canvas },
          layers: JSON.parse(JSON.stringify(clip.layers)),
          activeLayerId: clip.activeLayerId,
          nextLayerId: clip.nextLayerId,
          viewSettings: { ...clip.viewSettings },
        }
      : d
  );
  useProjectStore.setState({
    project: { ...useProjectStore.getState().project, documents: docs, activeDocId: newDoc.id },
  });
  useProjectStore.getState().restoreDocState();
  setStatus(t("status.docPasted"));
}
