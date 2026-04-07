import { useEffect, useCallback } from "react";
import { useProjectStore } from "../stores/projectStore";
import { useEditorStore } from "../stores/editorStore";
import { setStatus } from "../stores/statusStore";
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

    // Escape: 채색모드 해제 → 선택 해제
    if (e.key === "Escape") {
      const mode = useEditorStore.getState().editorMode;
      if (mode !== "normal") {
        useEditorStore.getState().setEditorMode("normal");
      } else {
        useProjectStore.getState().setActiveLayer(null);
      }
      return;
    }

    // Copy/Paste
    // textarea 안에서 텍스트 선택 중이면 일반 텍스트 복사에 맡김
    // 선택 영역 없으면 레이어 복사/붙여넣기로 처리
    if (mod && (e.key === "c" || e.key === "v")) {
      const hasTextSelection =
        inTextarea &&
        target instanceof HTMLTextAreaElement &&
        target.selectionStart !== target.selectionEnd;

      if (hasTextSelection) return; // 일반 텍스트 복사/붙여넣기에 맡김

      e.preventDefault();
      const tabFocused = useEditorStore.getState().tabBarFocused;

      if (e.key === "c") {
        if (tabFocused) {
          copyDocument();
        } else {
          copyLayers();
        }
      } else {
        const docClip = useEditorStore.getState().docClipboard;
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
    layers: s.layers.map((l) => ({ ...l })),
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
  const editor = useEditorStore.getState();
  const snap = editor.popUndo();
  if (!snap) { setStatus(t("status.cannotUndo")); return; }
  editor.pushRedo(captureSnapshot());
  restoreSnapshot(snap);
  setStatus(t("status.undo"));
}

function redo() {
  const editor = useEditorStore.getState();
  const snap = editor.popRedo();
  if (!snap) { setStatus(t("status.cannotRedo")); return; }
  editor.pushUndo(captureSnapshot());
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
    }));
  useEditorStore.getState().setLayerClipboard(clipboard);
  setStatus(`${clipboard.length}개 레이어 복사됨`);
}

function pasteLayers() {
  const clipboard = useEditorStore.getState().layerClipboard;
  if (clipboard.length === 0) return;

  useEditorStore.getState().pushUndo(captureSnapshot());

  const store = useProjectStore.getState();
  const offset = 18; // LINE_HEIGHT
  const newSelected = new Set<number>();

  clipboard.forEach((lc) => {
    const layer = store.createLayer(lc.text, lc.x + offset, lc.y + offset, lc.w, lc.h, {
      type: lc.type,
      imageSrc: lc.imageSrc,
      opacity: lc.opacity,
      textColor: lc.textColor,
    });
    layer.name = lc.name + " copy";
    newSelected.add(layer.id);
  });

  useProjectStore.setState({ selectedLayerIds: newSelected });
  setStatus(`${clipboard.length}개 레이어 붙여넣기됨`);
}

// ── Document Copy/Paste ──

function copyDocument() {
  const store = useProjectStore.getState();
  store.saveCurrentDocState();
  const doc = store.project.documents.find(
    (d) => d.id === store.project.activeDocId
  );
  if (!doc) return;
  const clip = JSON.parse(JSON.stringify(doc));
  delete clip.id;
  useEditorStore.getState().setDocClipboard(clip);
  setStatus(`문서 "${doc.name}" 복사됨`);
}

function pasteDocument() {
  const clip = useEditorStore.getState().docClipboard as any;
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
