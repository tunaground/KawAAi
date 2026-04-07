import { useRef, useEffect, useCallback } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { CANVAS_MARGIN, LINE_HEIGHT } from "../../lib/fontMetrics";
import { getSnapX } from "../../lib/compositor";
import { LayerBox } from "./LayerBox";
import styles from "./Canvas.module.css";

export function Canvas() {
  const layers = useProjectStore((s) => s.layers);
  const activeLayerId = useProjectStore((s) => s.activeLayerId);
  const canvasSize = useProjectStore((s) => s.canvasSize);
  const setCanvasSize = useProjectStore((s) => s.setCanvasSize);
  const gridVisible = useProjectStore((s) => s.viewSettings.gridVisible);
  const isDraggingLayer = useProjectStore((s) => s.isDraggingLayer);

  const canvasRef = useRef<HTMLDivElement>(null);
  const safeAreaRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLCanvasElement>(null);
  const rulerTopRef = useRef<HTMLCanvasElement>(null);
  const rulerLeftRef = useRef<HTMLCanvasElement>(null);
  const guidesRef = useRef<HTMLCanvasElement>(null);

  const m = CANVAS_MARGIN;

  // ── 그리드 그리기 ──
  const drawGrid = useCallback(() => {
    const sa = safeAreaRef.current;
    const canvas = gridRef.current;
    if (!sa || !canvas) return;
    const w = sa.offsetWidth;
    const h = sa.offsetHeight;
    const snapX = getSnapX();
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
    for (let y = 0; y < h; y += LINE_HEIGHT) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }, []);

  // ── 눈금자 그리기 ──
  const drawRulers = useCallback(() => {
    const el = canvasRef.current;
    if (!el) return;
    const cw = el.offsetWidth;
    const ch = el.offsetHeight;
    const sw = cw - m * 2;
    const sh = ch - m * 2;
    const dpr = window.devicePixelRatio || 1;

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
    for (let x = 0; x <= sw; x += 10) {
      const px = m + x;
      const isMajor = x % 50 === 0;
      const tickH = isMajor ? m * 0.45 : m * 0.2;
      ct.strokeStyle = isMajor ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.12)";
      ct.lineWidth = 0.5;
      ct.beginPath();
      ct.moveTo(px, m);
      ct.lineTo(px, m - tickH);
      ct.stroke();
      if (isMajor && x > 0) ct.fillText(String(x), px, m - tickH - 2);
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
    for (let y = 0; y <= sh; y += 10) {
      const py = m + y;
      const isMajor = y % 50 === 0;
      const tickW = isMajor ? m * 0.45 : m * 0.2;
      cl.strokeStyle = isMajor ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.12)";
      cl.lineWidth = 0.5;
      cl.beginPath();
      cl.moveTo(m, py);
      cl.lineTo(m - tickW, py);
      cl.stroke();
      if (isMajor && y > 0) cl.fillText(String(y), m - tickW - 2, py);
    }
  }, [m]);

  // ── 가이드 빔 그리기 ──
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
  }, [activeLayerId, layers, isDraggingLayer, m]);

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

  return (
    <div className={styles.canvasArea}>
      <div className={styles.canvas} ref={canvasRef} style={{ width: canvasSize.width, height: canvasSize.height }}>
        <div className={styles.canvasResizeHandle} onMouseDown={startCanvasResize} />
        <canvas className={styles.rulerTop} ref={rulerTopRef} />
        <canvas className={styles.rulerLeft} ref={rulerLeftRef} />
        <canvas className={styles.guides} ref={guidesRef} />

        <div className={styles.safeArea} ref={safeAreaRef}>
          {gridVisible && (
            <canvas className={styles.grid} ref={gridRef} />
          )}
          {layers.map((layer, idx) => (
            <LayerBox key={layer.id} layer={layer} zIndex={idx + 1} />
          ))}
        </div>
      </div>
    </div>
  );
}
