import { useRef, useCallback } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { useEditorStore } from "../../stores/editorStore";
import { getDotString } from "../../lib/dotInput";
import type { Layer } from "../../types/project";
import styles from "./LayerBox.module.css";

interface LayerBoxProps {
  layer: Layer;
  zIndex: number;
}

export function LayerBox({ layer, zIndex }: LayerBoxProps) {
  const activeLayerId = useProjectStore((s) => s.activeLayerId);
  const selectedLayerIds = useProjectStore((s) => s.selectedLayerIds);
  const setActiveLayer = useProjectStore((s) => s.setActiveLayer);
  const updateLayer = useProjectStore((s) => s.updateLayer);
  const viewSettings = useProjectStore((s) => s.viewSettings);

  const setDragState = useEditorStore((s) => s.setDragState);
  const setIsDraggingLayer = useEditorStore((s) => s.setIsDraggingLayer);
  const pushUndo = useEditorStore((s) => s.pushUndo);

  const isActive = layer.id === activeLayerId;
  const isSelected = selectedLayerIds.has(layer.id);

  // 도트 입력 상태
  const dotRef = useRef({ index: 0, startPos: -1, currentLen: 0 });

  const startDrag = useCallback(
    (e: React.MouseEvent, type: "move" | "resize") => {
      if (layer.locked) return;
      e.preventDefault();
      e.stopPropagation();

      // undo snapshot
      const state = useProjectStore.getState();
      pushUndo({
        layers: state.layers.map((l) => ({ ...l })),
        activeLayerId: state.activeLayerId,
        selectedLayerIds: [...state.selectedLayerIds],
        nextLayerId: state.nextLayerId,
      });

      setActiveLayer(layer.id);
      if (type === "move") setIsDraggingLayer(true);
      setDragState({
        type,
        layerId: layer.id,
        startX: e.clientX,
        startY: e.clientY,
        origX: layer.x,
        origY: layer.y,
        origW: layer.w,
        origH: layer.h,
      });
    },
    [layer, setActiveLayer, setDragState, setIsDraggingLayer, pushUndo]
  );

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateLayer(layer.id, { text: e.target.value });
    },
    [layer.id, updateLayer]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const ta = e.currentTarget;
      if (e.key === " ") {
        e.preventDefault();
        const dot = dotRef.current;
        const curPos = ta.selectionStart;

        if (dot.startPos === -1) {
          dot.startPos = curPos;
        } else if (curPos !== dot.startPos + dot.currentLen) {
          dot.index = 0;
          dot.startPos = curPos;
          dot.currentLen = 0;
        }

        const before = ta.value.substring(0, dot.startPos);
        const after = ta.value.substring(dot.startPos + dot.currentLen);
        const newDot = getDotString(dot.index);
        dot.currentLen = newDot.length;
        const newValue = before + newDot + after;
        ta.value = newValue;
        ta.selectionStart = ta.selectionEnd = dot.startPos + dot.currentLen;
        dot.index++;
        updateLayer(layer.id, { text: newValue });
      } else if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        dotRef.current = { index: 0, startPos: -1, currentLen: 0 };
      }
    },
    [layer.id, updateLayer]
  );

  const className = [
    styles.layerBox,
    isActive ? styles.active : "",
    isSelected && !isActive ? styles.selected : "",
    layer.type === "image" ? styles.imageLayer : "",
    layer.locked ? styles.locked : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      style={{
        left: layer.x,
        top: layer.y,
        width: layer.w,
        height: layer.h,
        zIndex,
        opacity: layer.visible ? layer.opacity : 0,
        display: layer.visible ? "" : "none",
      }}
      onMouseDown={() => setActiveLayer(layer.id)}
    >
      {/* 이동 핸들 (우상단) */}
      <div
        className={`${styles.handle} ${styles.moveHandle}`}
        onMouseDown={(e) => startDrag(e, "move")}
      />
      {/* 리사이즈 핸들 (우하단) */}
      <div
        className={`${styles.handle} ${styles.resizeHandle}`}
        onMouseDown={(e) => startDrag(e, "resize")}
      />

      {layer.type === "image" ? (
        <img
          className={styles.layerImage}
          src={layer.imageSrc}
          alt=""
          draggable={false}
        />
      ) : (
        <div className={styles.editArea}>
          <div
            className={styles.display}
            style={{ color: layer.textColor }}
          >
            {viewSettings.charGridEnabled
              ? [...layer.text].map((ch, i) =>
                  ch === "\n" ? (
                    "\n"
                  ) : (
                    <span
                      key={i}
                      style={{
                        background:
                          i % 2 === 0
                            ? "rgba(255,0,0,0.2)"
                            : "rgba(0,100,255,0.2)",
                      }}
                    >
                      {ch}
                    </span>
                  )
                )
              : layer.text}
          </div>
          <textarea
            className={styles.textarea}
            value={layer.text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={() => setActiveLayer(layer.id)}
            spellCheck={false}
            style={{ caretColor: layer.textColor }}
            readOnly={layer.locked}
          />
        </div>
      )}
    </div>
  );
}
