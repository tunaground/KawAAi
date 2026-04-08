import { useState, useRef, useCallback, useEffect } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { getDotString } from "../../lib/dotInput";
import { useI18n } from "../../i18n";
import styles from "./QuickEditModal.module.css";

interface QuickEditModalProps {
  open: boolean;
  onClose: () => void;
}

export function QuickEditModal({ open, onClose }: QuickEditModalProps) {
  const createLayer = useProjectStore((s) => s.createLayer);
  const docFontSize = useProjectStore((s) => s.fontSize);
  const docLineHeight = useProjectStore((s) => s.lineHeight);
  const t = useI18n((s) => s.t);

  const [text, setText] = useState("");
  const [imgSrc, setImgSrc] = useState("");
  const [imgScale, setImgScale] = useState(100);
  const [imgOpacity, setImgOpacity] = useState(50);
  const [imgX, setImgX] = useState(0);
  const [imgY, setImgY] = useState(0);
  const [textColor, setTextColor] = useState("#000000");
  const [canvasW, setCanvasW] = useState(400);
  const [canvasH, setCanvasH] = useState(300);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imgNatSize = useRef({ w: 0, h: 0 });

  // 도트 입력 상태
  const dotRef = useRef({ index: 0, startPos: -1, currentLen: 0 });

  // 이미지 드래그
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  // 캔버스 리사이즈 드래그
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);

  useEffect(() => {
    if (open) {
      setText("");
      setImgSrc("");
      setImgScale(100);
      setImgOpacity(50);
      setImgX(0);
      setImgY(0);
      setTextColor("#000000");
      setCanvasW(400);
      setCanvasH(300);
      dotRef.current = { index: 0, startPos: -1, currentLen: 0 };
    }
  }, [open]);

  // 전역 마우스 이벤트 (이미지 드래그 + 캔버스 리사이즈)
  useEffect(() => {
    if (!open) return;

    const onMouseMove = (e: MouseEvent) => {
      if (dragRef.current) {
        setImgX(dragRef.current.origX + (e.clientX - dragRef.current.startX));
        setImgY(dragRef.current.origY + (e.clientY - dragRef.current.startY));
      }
      if (resizeRef.current) {
        setCanvasW(Math.max(100, resizeRef.current.origW + (e.clientX - resizeRef.current.startX)));
        setCanvasH(Math.max(60, resizeRef.current.origH + (e.clientY - resizeRef.current.startY)));
      }
    };
    const onMouseUp = () => {
      dragRef.current = null;
      resizeRef.current = null;
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [open]);

  const handleLoadImage = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        imgNatSize.current = { w: img.naturalWidth, h: img.naturalHeight };
        setImgSrc(ev.target?.result as string);
        setImgX(0);
        setImgY(0);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

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
        const newVal = before + newDot + after;
        setText(newVal);
        // cursor 복원은 다음 프레임
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = dot.startPos + dot.currentLen;
        });
        dot.index++;
      } else if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        dotRef.current = { index: 0, startPos: -1, currentLen: 0 };
      }
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  const handleInsert = () => {
    if (!text.trim()) return;
    const layers = useProjectStore.getState().layers;
    const offset = layers.length * 20;
    const layer = createLayer(text, 20 + offset, 20 + offset, canvasW, canvasH, { textColor });
    layer.name = "Quick Edit";
    onClose();
  };

  if (!open) return null;

  const scaledW = imgNatSize.current.w * (imgScale / 100);
  const scaledH = imgNatSize.current.h * (imgScale / 100);

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <span>{t("quickEdit.title")}</span>
          <div className={styles.headerBtns}>
            <button className={styles.btn} onClick={handleLoadImage}>
              {t("quickEdit.loadImage")}
            </button>
            <button className={`${styles.btn} ${styles.primary}`} onClick={handleInsert}>
              {t("quickEdit.insert")}
            </button>
            <button className={styles.btn} onClick={onClose}>
              {t("quickEdit.close")}
            </button>
          </div>
        </div>

        <div className={styles.body}>
          <div
            className={styles.canvasWrap}
            style={{ width: canvasW, height: canvasH }}
          >
            {imgSrc && (
              <img
                src={imgSrc}
                style={{
                  position: "absolute",
                  left: imgX,
                  top: imgY,
                  width: scaledW,
                  height: scaledH,
                  opacity: imgOpacity / 100,
                  pointerEvents: "none",
                }}
                alt=""
                draggable={false}
              />
            )}
            {/* 이미지 이동 핸들 */}
            <div
              className={styles.imgMoveHandle}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                dragRef.current = { startX: e.clientX, startY: e.clientY, origX: imgX, origY: imgY };
              }}
            />
            {/* 캔버스 리사이즈 핸들 */}
            <div
              className={styles.canvasResizeHandle}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                resizeRef.current = { startX: e.clientX, startY: e.clientY, origW: canvasW, origH: canvasH };
              }}
            />
            <div className={styles.display} style={{ color: textColor, fontSize: `${docFontSize}px`, lineHeight: `${docLineHeight}px` }}>
              {text}
            </div>
            <textarea
              ref={textareaRef}
              className={styles.textarea}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              style={{ caretColor: textColor, fontSize: `${docFontSize}px`, lineHeight: `${docLineHeight}px` }}
            />
          </div>

          <div className={styles.sidebar}>
            <label>
              {t("quickEdit.imageScale")} {imgScale}%
              <input
                type="range"
                min={10}
                max={500}
                value={imgScale}
                onChange={(e) => setImgScale(Number(e.target.value))}
              />
            </label>
            <label>
              {t("quickEdit.imageOpacity")} {imgOpacity}%
              <input
                type="range"
                min={0}
                max={100}
                value={imgOpacity}
                onChange={(e) => setImgOpacity(Number(e.target.value))}
              />
            </label>
            <label>
              {t("quickEdit.textColor")}
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className={styles.colorInput}
              />
            </label>
          </div>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </div>
  );
}
