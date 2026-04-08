import { useRef, useEffect, useCallback, useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { CANVAS_MARGIN } from "../../lib/fontMetrics";
import { getSnapX } from "../../lib/compositor";
import { LayerBox } from "./LayerBox";
import styles from "./Canvas.module.css";

/** 가이드 드래그 상태 */
interface GuideDrag {
  axis: "h" | "v";          // h=수평선(Y좌표), v=수직선(X좌표)
  pos: number;               // 현재 위치 (safe area 기준 px)
  existingIndex: number | null; // 기존 가이드 인덱스 (null=신규 생성)
}

const GUIDE_HIT = 4; // 가이드 히트 영역 (px)

export function Canvas() {
  const layers = useProjectStore((s) => s.layers);
  const activeLayerId = useProjectStore((s) => s.activeLayerId);
  const canvasSize = useProjectStore((s) => s.canvasSize);
  const setCanvasSize = useProjectStore((s) => s.setCanvasSize);
  const gridVisible = useProjectStore((s) => s.viewSettings.gridVisible);
  const canvasLocked = useProjectStore((s) => s.viewSettings.canvasLocked);
  const fontSize = useProjectStore((s) => s.fontSize);
  const lineHeight = useProjectStore((s) => s.lineHeight);
  const rulerUnit = useProjectStore((s) => s.viewSettings.rulerUnit);
  const isDraggingLayer = useProjectStore((s) => s.isDraggingLayer);
  const guides = useProjectStore((s) => s.guides);

  const canvasRef = useRef<HTMLDivElement>(null);
  const safeAreaRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLCanvasElement>(null);
  const rulerTopRef = useRef<HTMLCanvasElement>(null);
  const rulerLeftRef = useRef<HTMLCanvasElement>(null);
  const guidesRef = useRef<HTMLCanvasElement>(null);

  const m = CANVAS_MARGIN;

  // 가이드 드래그 상태
  const [guideDrag, setGuideDrag] = useState<GuideDrag | null>(null);
  const guideDragRef = useRef<GuideDrag | null>(null);
  guideDragRef.current = guideDrag;

  // ── 그리드 그리기 ──
  const drawGrid = useCallback(() => {
    const sa = safeAreaRef.current;
    const canvas = gridRef.current;
    if (!sa || !canvas) return;
    const w = sa.offsetWidth;
    const h = sa.offsetHeight;
    const snapX = getSnapX(fontSize);
    if (w <= 0 || h <= 0 || snapX < 1) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(0, 120, 255, 0.08)";
    ctx.lineWidth = 1 / dpr;
    for (let x = 0; x < w; x += snapX) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(0, 120, 255, 0.12)";
    for (let y = 0; y < h; y += lineHeight) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }, [fontSize, lineHeight]);

  // ── 눈금자 그리기 ──
  const drawRulers = useCallback(() => {
    const el = canvasRef.current;
    if (!el) return;
    const cw = el.offsetWidth;
    const ch = el.offsetHeight;
    const sw = cw - m * 2;
    const sh = ch - m * 2;
    const dpr = window.devicePixelRatio || 1;

    const isMm = rulerUnit === "mm";
    const mmPx = 96 / 25.4;
    const minor = isMm ? mmPx : 10;
    const major = isMm ? mmPx * 10 : 100;

    // Top
    const rtop = rulerTopRef.current!;
    rtop.width = cw * dpr;
    rtop.height = m * dpr;
    rtop.style.width = cw + "px";
    rtop.style.height = m + "px";
    const ct = rtop.getContext("2d")!;
    ct.scale(dpr, dpr);
    ct.clearRect(0, 0, cw, m);
    ct.fillStyle = "rgba(0,0,0,0.25)";
    ct.font = "7px sans-serif";
    ct.textAlign = "center";
    for (let i = 0; i * minor <= sw; i++) {
      const x = i * minor;
      const px = m + x;
      const isMajorTick = i > 0 && Math.abs(x % major) < 0.5;
      const tickH = isMajorTick ? m * 0.45 : m * 0.2;
      ct.strokeStyle = isMajorTick ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.12)";
      ct.lineWidth = 0.5;
      ct.beginPath();
      ct.moveTo(px, m);
      ct.lineTo(px, m - tickH);
      ct.stroke();
      if (isMajorTick) {
        const label = isMm ? String(Math.round(x / mmPx)) : String(Math.round(x));
        ct.fillText(label, px, m - tickH - 2);
      }
    }

    // Left
    const rleft = rulerLeftRef.current!;
    rleft.width = m * dpr;
    rleft.height = ch * dpr;
    rleft.style.width = m + "px";
    rleft.style.height = ch + "px";
    const cl = rleft.getContext("2d")!;
    cl.scale(dpr, dpr);
    cl.clearRect(0, 0, m, ch);
    cl.fillStyle = "rgba(0,0,0,0.25)";
    cl.font = "7px sans-serif";
    cl.textAlign = "right";
    cl.textBaseline = "middle";
    for (let i = 0; i * minor <= sh; i++) {
      const y = i * minor;
      const py = m + y;
      const isMajorTick = i > 0 && Math.abs(y % major) < 0.5;
      const tickW = isMajorTick ? m * 0.45 : m * 0.2;
      cl.strokeStyle = isMajorTick ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.12)";
      cl.lineWidth = 0.5;
      cl.beginPath();
      cl.moveTo(m, py);
      cl.lineTo(m - tickW, py);
      cl.stroke();
      if (isMajorTick) {
        const label = isMm ? String(Math.round(y / mmPx)) : String(Math.round(y));
        cl.fillText(label, m - tickW - 2, py);
      }
    }
  }, [m, rulerUnit]);

  // ── 가이드 빔 + 커스텀 가이드 그리기 ──
  const drawGuides = useCallback(() => {
    const el = canvasRef.current;
    const canvas = guidesRef.current;
    if (!el || !canvas) return;
    const cw = el.offsetWidth;
    const ch = el.offsetHeight;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    canvas.style.width = cw + "px";
    canvas.style.height = ch + "px";

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cw, ch);

    // 커스텀 가이드 렌더링
    ctx.strokeStyle = "rgba(0, 160, 255, 0.7)";
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1 / dpr;
    for (const y of guides.h) {
      const py = m + y;
      ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(cw, py); ctx.stroke();
    }
    for (const x of guides.v) {
      const px = m + x;
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, ch); ctx.stroke();
    }

    // 드래그 중인 가이드 (미리보기)
    const drag = guideDragRef.current;
    if (drag) {
      ctx.strokeStyle = "rgba(0, 160, 255, 1)";
      ctx.setLineDash([]);
      ctx.lineWidth = 1 / dpr;
      if (drag.axis === "h") {
        const py = m + drag.pos;
        ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(cw, py); ctx.stroke();
      } else {
        const px = m + drag.pos;
        ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, ch); ctx.stroke();
      }
    }

    ctx.setLineDash([]);

    // 활성 레이어 가이드
    if (activeLayerId === null) return;
    const layer = layers.find((l) => l.id === activeLayerId);
    if (!layer) return;

    const lx = m + layer.x;
    const ly = m + layer.y;
    const lw = layer.w;
    const lh = layer.h;

    if (isDraggingLayer) {
      ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
      ctx.setLineDash([]);
    } else {
      ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
      ctx.setLineDash([2, 4]);
    }
    ctx.lineWidth = 1 / dpr;

    [ly, ly + lh].forEach((y) => {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke();
    });
    [lx, lx + lw].forEach((x) => {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ch); ctx.stroke();
    });

    ctx.setLineDash([]);
    const crossAlpha = isDraggingLayer ? 0.9 : 0.6;
    ctx.strokeStyle = `rgba(255, 0, 0, ${crossAlpha})`;
    const cs = 3;
    [[lx, ly], [lx + lw, ly], [lx, ly + lh], [lx + lw, ly + lh]].forEach(
      ([cx, cy]) => {
        ctx.beginPath(); ctx.moveTo(cx - cs, cy); ctx.lineTo(cx + cs, cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy - cs); ctx.lineTo(cx, cy + cs); ctx.stroke();
      }
    );
  }, [activeLayerId, layers, isDraggingLayer, m, guides, guideDrag]);

  // ── safe area 크기 계산 ──
  const updateSafeArea = useCallback(() => {
    const el = canvasRef.current;
    const sa = safeAreaRef.current;
    if (!el || !sa) return;
    const cw = el.offsetWidth;
    const ch = el.offsetHeight;
    sa.style.left = m + "px";
    sa.style.top = m + "px";
    sa.style.width = cw - m * 2 + "px";
    sa.style.height = ch - m * 2 + "px";
  }, [m]);

  // 리사이즈 감지
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      updateSafeArea();
      drawGrid();
      drawRulers();
      drawGuides();
    });
    ro.observe(el);
    updateSafeArea();
    drawGrid();
    drawRulers();
    drawGuides();
    return () => ro.disconnect();
  }, [updateSafeArea, drawGrid, drawRulers, drawGuides]);

  // 가이드 갱신
  useEffect(() => {
    drawGuides();
  }, [drawGuides]);

  // ── 캔버스 리사이즈 드래그 ──
  const canvasResizeDrag = useRef<{ startX: number; startY: number; origW: number; origH: number; minW: number; minH: number } | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const drag = canvasResizeDrag.current;
      if (!drag || !canvasRef.current) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;

      canvasRef.current.style.width = Math.max(drag.minW, drag.origW + dx) + "px";
      canvasRef.current.style.height = Math.max(drag.minH, drag.origH + dy) + "px";
    };
    const onUp = () => {
      if (canvasResizeDrag.current && canvasRef.current) {
        setCanvasSize({
          width: canvasRef.current.offsetWidth,
          height: canvasRef.current.offsetHeight,
        });
      }
      canvasResizeDrag.current = null;
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [m]);

  const startCanvasResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canvasRef.current) return;
    let maxR = 0, maxB = 0;
    useProjectStore.getState().layers.forEach((l) => {
      maxR = Math.max(maxR, l.x + l.w);
      maxB = Math.max(maxB, l.y + l.h);
    });
    canvasResizeDrag.current = {
      startX: e.clientX,
      startY: e.clientY,
      origW: canvasRef.current.offsetWidth,
      origH: canvasRef.current.offsetHeight,
      minW: m * 2 + maxR,
      minH: m * 2 + maxB,
    };
  };

  // ── 가이드 드래그 핸들러 ──
  const getCanvasRelPos = (e: React.MouseEvent | MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left - m, y: e.clientY - rect.top - m };
  };

  const formatPos = (px: number) => {
    if (rulerUnit === "mm") {
      return `${(px * 25.4 / 96).toFixed(1)}mm`;
    }
    return `${Math.round(px)}px`;
  };

  // 룰러 영역에서 기존 가이드 탐색
  const findGuideAtRuler = (axis: "h" | "v", pos: number): number | null => {
    const store = useProjectStore.getState();
    const arr = store.guides[axis];
    for (let i = 0; i < arr.length; i++) {
      if (Math.abs(arr[i] - pos) <= GUIDE_HIT) return i;
    }
    return null;
  };

  // 상단 룰러(x축) → 세로 가이드(v), 좌측 룰러(y축) → 가로 가이드(h)
  // 가이드 생성/이동/제거 모두 룰러에서만 가능
  const handleRulerMouseDown = (axis: "h" | "v") => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rel = getCanvasRelPos(e);
    // axis="v" → 상단 룰러: x좌표 기준, axis="h" → 좌측 룰러: y좌표 기준
    const pos = axis === "v" ? rel.x : rel.y;
    const existing = findGuideAtRuler(axis, pos);

    setGuideDrag({ axis, pos, existingIndex: existing });

    const onMove = (ev: MouseEvent) => {
      const r = canvasRef.current?.getBoundingClientRect();
      if (!r) return;
      const newPos = axis === "v"
        ? ev.clientX - r.left - m
        : ev.clientY - r.top - m;
      setGuideDrag((prev) => prev ? { ...prev, pos: newPos } : null);
    };

    const onUp = (ev: MouseEvent) => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);

      const r = canvasRef.current?.getBoundingClientRect();
      if (!r) { setGuideDrag(null); return; }

      const finalPos = axis === "v"
        ? ev.clientX - r.left - m
        : ev.clientY - r.top - m;

      const safeW = r.width - m * 2;
      const safeH = r.height - m * 2;
      const inSafeArea = axis === "v"
        ? finalPos >= 0 && finalPos <= safeW
        : finalPos >= 0 && finalPos <= safeH;

      const store = useProjectStore.getState();

      if (existing !== null) {
        if (inSafeArea) {
          store.updateGuide(axis, existing, finalPos);
        } else {
          store.removeGuide(axis, existing);
        }
      } else {
        if (inSafeArea) {
          store.addGuide(axis, finalPos);
        }
      }

      setGuideDrag(null);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  return (
    <div className={styles.canvasArea}>
      <div
        className={styles.canvas}
        ref={canvasRef}
        style={{ width: canvasSize.width, height: canvasSize.height }}
      >
        {!canvasLocked && <div className={styles.canvasResizeHandle} onMouseDown={startCanvasResize} />}
        <canvas className={styles.rulerTop} ref={rulerTopRef} />
        <canvas className={styles.rulerLeft} ref={rulerLeftRef} />
        <canvas className={styles.guides} ref={guidesRef} />

        {/* 룰러 인터랙션 오버레이: 상단(x축)→세로가이드(v), 좌측(y축)→가로가이드(h) */}
        <div
          className={styles.rulerTopHit}
          onMouseDown={handleRulerMouseDown("v")}
        />
        <div
          className={styles.rulerLeftHit}
          onMouseDown={handleRulerMouseDown("h")}
        />

        <div className={styles.safeArea} ref={safeAreaRef}>
          {gridVisible && (
            <canvas className={styles.grid} ref={gridRef} />
          )}
          {layers.map((layer, idx) => (
            <LayerBox key={layer.id} layer={layer} zIndex={idx + 1} />
          ))}
        </div>

        {/* 드래그 중 위치 툴팁 */}
        {guideDrag && (
          <div
            className={styles.guideTooltip}
            style={guideDrag.axis === "h"
              ? { left: m + 8, top: m + guideDrag.pos - 20 }
              : { left: m + guideDrag.pos + 8, top: m + 8 }
            }
          >
            {formatPos(guideDrag.pos)}
          </div>
        )}
      </div>
    </div>
  );
}
