import { memo, useRef, useCallback, useState, useMemo } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { saveUndoSnapshot } from "../../stores/projectStore";
import { getDotString } from "../../lib/dotInput";
import { measureString, LAYER_PADDING, LINE_HEIGHT } from "../../lib/fontMetrics";
import type { Layer, OpaqueRange } from "../../types/project";
import styles from "./LayerBox.module.css";

interface LayerBoxProps {
  layer: Layer;
  zIndex: number;
}

export const LayerBox = memo(function LayerBox({ layer, zIndex }: LayerBoxProps) {
  const activeLayerId = useProjectStore((s) => s.activeLayerId);
  const selectedLayerIds = useProjectStore((s) => s.selectedLayerIds);
  const setActiveLayer = useProjectStore((s) => s.setActiveLayer);
  const updateLayer = useProjectStore((s) => s.updateLayer);
  const charGridEnabled = useProjectStore((s) => s.viewSettings.charGridEnabled);

  const setDragState = useProjectStore((s) => s.setDragState);
  const setIsDraggingLayer = useProjectStore((s) => s.setIsDraggingLayer);
  const editorMode = useProjectStore((s) => s.editorMode);

  const isActive = layer.id === activeLayerId;
  const isSelected = selectedLayerIds.has(layer.id);
  const isOpaqueMode = editorMode === "opaquePaint" || editorMode === "opaqueErase";

  // 도트 입력 상태
  const dotRef = useRef({ index: 0, startPos: -1, currentLen: 0 });
  // 포커스 세션당 undo 스냅샷 1회만 저장
  const undoSavedRef = useRef(false);

  // ── 채색 드래그 ──
  const [opaqueDragRect, setOpaqueDragRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const handleOpaqueDragStart = useCallback((e: React.MouseEvent) => {
    if (!isActive || !isOpaqueMode || layer.type !== "text") return;
    e.preventDefault();
    e.stopPropagation();
    const box = boxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;

    setOpaqueDragRect({ x: startX - rect.left, y: startY - rect.top, w: 0, h: 0 });

    const onMove = (ev: MouseEvent) => {
      const curX = ev.clientX - rect.left;
      const curY = ev.clientY - rect.top;
      const sx = startX - rect.left;
      const sy = startY - rect.top;
      setOpaqueDragRect({
        x: Math.min(sx, curX),
        y: Math.min(sy, curY),
        w: Math.abs(curX - sx),
        h: Math.abs(curY - sy),
      });
    };

    const onUp = (ev: MouseEvent) => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setOpaqueDragRect(null);

      // 픽셀 영역 → 캐릭터 포지션 변환
      const x1 = Math.min(startX, ev.clientX) - rect.left - LAYER_PADDING;
      const y1 = Math.min(startY, ev.clientY) - rect.top - LAYER_PADDING;
      const x2 = Math.max(startX, ev.clientX) - rect.left - LAYER_PADDING;
      const y2 = Math.max(startY, ev.clientY) - rect.top - LAYER_PADDING;

      const startLine = Math.max(0, Math.floor(y1 / LINE_HEIGHT));
      const endLine = Math.ceil(y2 / LINE_HEIGHT);

      // 최신 layer 상태 가져오기
      const currentLayer = useProjectStore.getState().layers.find(l => l.id === layer.id);
      if (!currentLayer) return;
      const lines = currentLayer.text.split("\n");

      const newRanges: OpaqueRange[] = [];
      for (let ln = startLine; ln < endLine && ln < lines.length; ln++) {
        const measured = measureString(lines[ln]);
        let sc = -1;
        let ec = -1;
        measured.forEach((m, col) => {
          if (m.x < x2 && m.x + m.width > x1) {
            if (sc === -1) sc = col;
            ec = col + 1;
          }
        });
        if (sc !== -1) newRanges.push({ line: ln, startCol: sc, endCol: ec });
      }

      if (newRanges.length === 0) return;

      // undo
      saveUndoSnapshot();

      const mode = useProjectStore.getState().editorMode;
      if (mode === "opaquePaint") {
        const merged = mergeOpaqueRanges([...currentLayer.opaqueRanges, ...newRanges]);
        updateLayer(layer.id, { opaqueRanges: merged });
      } else {
        const erased = subtractOpaqueRanges(currentLayer.opaqueRanges, newRanges);
        updateLayer(layer.id, { opaqueRanges: erased });
      }
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [isActive, isOpaqueMode, layer.id, layer.type, updateLayer]);

  const startDrag = useCallback(
    (e: React.MouseEvent, type: "move" | "resize") => {
      if (layer.locked) return;
      e.preventDefault();
      e.stopPropagation();

      // undo snapshot
      saveUndoSnapshot();

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
    [layer, setActiveLayer, setDragState, setIsDraggingLayer]
  );

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!undoSavedRef.current) {
        saveUndoSnapshot();
        undoSavedRef.current = true;
      }
      updateLayer(layer.id, { text: e.target.value });
    },
    [layer.id, updateLayer]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const ta = e.currentTarget;
      const mod = e.ctrlKey || e.metaKey;

      // Ctrl+V/X: 붙여넣기/잘라내기 전에 undo 스냅샷 저장
      if (mod && (e.key === "v" || e.key === "x")) {
        saveUndoSnapshot();
        undoSavedRef.current = true;
        return; // 브라우저 기본 동작에 맡김
      }

      if (e.key === " ") {
        e.preventDefault();
        if (!undoSavedRef.current) {
          saveUndoSnapshot();
          undoSavedRef.current = true;
        }
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

  // 채색 영역 표시용: 문자별 opaqueRange 체크
  const showOpaque = isOpaqueMode && isActive;
  const displayContent = useMemo(() => {
    if (layer.type !== "text") return null;
    if (!showOpaque && !charGridEnabled) return layer.text;

    const lines = layer.text.split("\n");
    const result: React.ReactNode[] = [];
    let keyIdx = 0;

    lines.forEach((line, lineIdx) => {
      const chars = [...line];
      chars.forEach((ch, col) => {
        let bg = "";
        if (showOpaque && isCharInOpaqueRanges(lineIdx, col, layer.opaqueRanges)) {
          bg = "rgba(255, 230, 0, 0.5)";
        } else if (charGridEnabled) {
          bg = keyIdx % 2 === 0 ? "rgba(255,0,0,0.2)" : "rgba(0,100,255,0.2)";
        }
        if (bg) {
          result.push(<span key={keyIdx} style={{ background: bg }}>{ch}</span>);
        } else {
          result.push(ch);
        }
        keyIdx++;
      });
      if (lineIdx < lines.length - 1) result.push("\n");
    });

    return result;
  }, [layer.type, layer.text, layer.opaqueRanges, showOpaque, charGridEnabled]);

  return (
    <div
      ref={boxRef}
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
      onMouseDown={(e) => {
        if (isOpaqueMode && isActive) {
          handleOpaqueDragStart(e);
        } else {
          setActiveLayer(layer.id);
        }
      }}
    >
      {/* 이동 핸들 (우상단) */}
      <div
        className={`${styles.handle} ${styles.moveHandle}`}
        onMouseDown={(e) => { e.stopPropagation(); startDrag(e, "move"); }}
      />
      {/* 리사이즈 핸들 (우하단) */}
      <div
        className={`${styles.handle} ${styles.resizeHandle}`}
        onMouseDown={(e) => { e.stopPropagation(); startDrag(e, "resize"); }}
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
            {displayContent}
          </div>
          {/* 채색모드에서는 textarea 비활성 (드래그가 textarea에 먹히지 않도록) */}
          {!isOpaqueMode && (
            <textarea
              className={styles.textarea}
              value={layer.text}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              onFocus={() => { undoSavedRef.current = false; setActiveLayer(layer.id); }}
              onBlur={() => { undoSavedRef.current = false; }}
              spellCheck={false}
              style={{ caretColor: layer.textColor }}
              readOnly={layer.locked}
            />
          )}
          {/* 채색 드래그 선택 영역 표시 */}
          {opaqueDragRect && (
            <div
              style={{
                position: "absolute",
                left: opaqueDragRect.x,
                top: opaqueDragRect.y,
                width: opaqueDragRect.w,
                height: opaqueDragRect.h,
                background: editorMode === "opaquePaint"
                  ? "rgba(255, 230, 0, 0.3)"
                  : "rgba(255, 50, 50, 0.3)",
                border: `1px dashed ${editorMode === "opaquePaint" ? "#ffc107" : "#f44336"}`,
                pointerEvents: "none",
                zIndex: 10,
              }}
            />
          )}
        </div>
      )}
    </div>
  );
});

// ── 헬퍼 함수 ──

function isCharInOpaqueRanges(line: number, col: number, ranges: OpaqueRange[]): boolean {
  return ranges.some(r => r.line === line && col >= r.startCol && col < r.endCol);
}

/** 같은 줄의 겹치는 범위를 병합 */
function mergeOpaqueRanges(ranges: OpaqueRange[]): OpaqueRange[] {
  if (ranges.length === 0) return [];
  const byLine = new Map<number, OpaqueRange[]>();
  ranges.forEach(r => {
    const arr = byLine.get(r.line) || [];
    arr.push(r);
    byLine.set(r.line, arr);
  });
  const result: OpaqueRange[] = [];
  byLine.forEach((lineRanges) => {
    lineRanges.sort((a, b) => a.startCol - b.startCol);
    let cur = { ...lineRanges[0] };
    for (let i = 1; i < lineRanges.length; i++) {
      const r = lineRanges[i];
      if (r.startCol <= cur.endCol) {
        cur.endCol = Math.max(cur.endCol, r.endCol);
      } else {
        result.push(cur);
        cur = { ...r };
      }
    }
    result.push(cur);
  });
  return result;
}

/** 기존 범위에서 제거 범위를 빼기 */
function subtractOpaqueRanges(existing: OpaqueRange[], toRemove: OpaqueRange[]): OpaqueRange[] {
  let result = [...existing];
  for (const rem of toRemove) {
    const next: OpaqueRange[] = [];
    for (const r of result) {
      if (r.line !== rem.line || r.endCol <= rem.startCol || r.startCol >= rem.endCol) {
        next.push(r); // 겹치지 않음
      } else {
        // 왼쪽 잔여
        if (r.startCol < rem.startCol) {
          next.push({ line: r.line, startCol: r.startCol, endCol: rem.startCol });
        }
        // 오른쪽 잔여
        if (r.endCol > rem.endCol) {
          next.push({ line: r.line, startCol: rem.endCol, endCol: r.endCol });
        }
      }
    }
    result = next;
  }
  return result;
}
