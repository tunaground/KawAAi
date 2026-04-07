import { useEffect } from "react";
import { useProjectStore } from "../stores/projectStore";
import { useEditorStore } from "../stores/editorStore";
import { LINE_HEIGHT } from "../lib/fontMetrics";
import { getSnapX } from "../lib/compositor";
import { getMeasureCtx } from "../lib/fontMetrics";
import { LAYER_PADDING } from "../lib/fontMetrics";

/**
 * 전역 마우스 이벤트 핸들러.
 * 레이어 이동/리사이즈 드래그를 처리.
 * App 레벨에서 한 번만 마운트.
 */
export function useDragHandler() {
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const dragState = useEditorStore.getState().dragState;
      if (!dragState) return;

      const store = useProjectStore.getState();
      const layer = store.layers.find((l) => l.id === dragState.layerId);
      if (!layer) return;

      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;

      if (dragState.type === "move") {
        const snapX = getSnapX();
        const snapEnabled = store.viewSettings.snapEnabled;
        let rawX = dragState.origX + dx;
        let rawY = dragState.origY + dy;

        if (snapEnabled && layer.type === "text") {
          rawX = Math.round(rawX / snapX) * snapX;
          rawY = Math.round(rawY / LINE_HEIGHT) * LINE_HEIGHT;
        }
        rawX = Math.max(0, rawX);
        rawY = Math.max(0, rawY);

        store.updateLayer(layer.id, { x: rawX, y: rawY });
      } else if (dragState.type === "resize") {
        if (layer.type === "image") {
          // Aspect-ratio locked resize
          const aspect = dragState.origW / dragState.origH;
          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);
          let rawW: number, rawH: number;
          if (absDx > absDy) {
            rawW = Math.max(30, dragState.origW + dx);
            rawH = rawW / aspect;
          } else {
            rawH = Math.max(30, dragState.origH + dy);
            rawW = rawH * aspect;
          }
          store.updateLayer(layer.id, {
            w: Math.max(30, rawW),
            h: Math.max(30, rawH),
          });
        } else {
          let rawW = dragState.origW + dx;
          let rawH = dragState.origH + dy;

          // Content minimum
          const ctx = getMeasureCtx();
          const lines = layer.text.split("\n");
          let maxLineW = 0;
          for (const line of lines) {
            maxLineW = Math.max(maxLineW, ctx.measureText(line).width);
          }
          const minW = Math.max(60, maxLineW + LAYER_PADDING * 2);
          const minH = Math.max(30, lines.length * LINE_HEIGHT + LAYER_PADDING * 2);
          rawW = Math.max(minW, rawW);
          rawH = Math.max(minH, rawH);

          const snapX = getSnapX();
          if (store.viewSettings.snapEnabled) {
            rawW = Math.ceil(rawW / snapX) * snapX;
            rawH = Math.ceil(rawH / LINE_HEIGHT) * LINE_HEIGHT;
          }

          store.updateLayer(layer.id, { w: rawW, h: rawH });
        }
      }
    };

    const handleMouseUp = () => {
      const editorStore = useEditorStore.getState();
      if (editorStore.dragState) {
        editorStore.setDragState(null);
        editorStore.setIsDraggingLayer(false);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);
}
