import { useState, useRef, useEffect } from "react";
import { Link, Unlink } from "lucide-react";
import { useProjectStore } from "../../stores/projectStore";
import { CANVAS_MARGIN, deriveLineHeight } from "../../lib/fontMetrics";
import { useI18n } from "../../i18n";
import styles from "./CanvasSettingsPopover.module.css";

const PRESETS = [
  // 모바일
  { label: "iPhone SE", width: 375, height: 667 },
  { label: "iPhone 16", width: 393, height: 852 },
  { label: "iPhone Max", width: 430, height: 932 },
  { label: "Galaxy S", width: 360, height: 800 },
  // 태블릿
  { label: "iPad Mini", width: 768, height: 1024 },
  { label: "iPad Pro 11", width: 834, height: 1194 },
  { label: "iPad Pro 13", width: 1024, height: 1366 },
  // 데스크탑
  { label: "HD", width: 1280, height: 720 },
  { label: "FHD", width: 1920, height: 1080 },
  { label: "QHD", width: 2560, height: 1440 },
  { label: "4K", width: 3840, height: 2160 },
];

interface Props {
  anchorRect: DOMRect;
  onClose: () => void;
}

export function CanvasSettingsPopover({ anchorRect, onClose }: Props) {
  const canvasSize = useProjectStore((s) => s.canvasSize);
  const setCanvasSize = useProjectStore((s) => s.setCanvasSize);
  const fontSize = useProjectStore((s) => s.fontSize);
  const lineHeight = useProjectStore((s) => s.lineHeight);
  const setFontSize = useProjectStore((s) => s.setFontSize);
  const setLineHeight = useProjectStore((s) => s.setLineHeight);
  const canvasLocked = useProjectStore((s) => s.viewSettings.canvasLocked);
  const setViewSetting = useProjectStore((s) => s.setViewSetting);
  const t = useI18n((s) => s.t);

  const popoverRef = useRef<HTMLDivElement>(null);

  // 행간 잠금: 현재 lineHeight가 비율 계산값과 일치하면 잠금
  const [lhLocked, setLhLocked] = useState(
    lineHeight === deriveLineHeight(fontSize)
  );

  // 가용영역 = 캔버스 크기 - margin * 2
  const usableW = canvasSize.width - CANVAS_MARGIN * 2;
  const usableH = canvasSize.height - CANVAS_MARGIN * 2;

  // 프리셋 자동 감지
  const matchedPreset = PRESETS.find(
    (p) => p.width === usableW && p.height === usableH
  );

  // 외부 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener("mouseup", handler);
    return () => document.removeEventListener("mouseup", handler);
  }, [onClose]);

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = PRESETS.find((p) => p.label === e.target.value);
    if (preset) {
      setCanvasSize({
        width: preset.width + CANVAS_MARGIN * 2,
        height: preset.height + CANVAS_MARGIN * 2,
      });
    }
  };

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val > 0) {
      setCanvasSize({ ...canvasSize, width: val + CANVAS_MARGIN * 2 });
    }
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val > 0) {
      setCanvasSize({ ...canvasSize, height: val + CANVAS_MARGIN * 2 });
    }
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      setFontSize(val);
      if (lhLocked) {
        setLineHeight(deriveLineHeight(Math.max(1, Math.min(48, val))));
      }
    }
  };

  const handleLineHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      setLineHeight(val);
    }
  };

  const toggleLhLock = () => {
    const next = !lhLocked;
    setLhLocked(next);
    if (next) {
      setLineHeight(deriveLineHeight(fontSize));
    }
  };

  return (
    <div
      ref={popoverRef}
      className={styles.popover}
      style={{ left: anchorRect.left, top: anchorRect.bottom + 4 }}
    >
      <div className={styles.title}>{t("header.canvasSettings")}</div>

      {/* 프리셋 */}
      <div className={styles.row}>
        <span className={styles.label}>{t("canvas.preset")}</span>
        <select
          className={styles.select}
          value={matchedPreset?.label ?? ""}
          onChange={handlePresetChange}
        >
          <option value="">{t("canvas.custom")}</option>
          <optgroup label="Mobile">
            {PRESETS.slice(0, 4).map((p) => (
              <option key={p.label} value={p.label}>
                {p.label} ({p.width}&times;{p.height})
              </option>
            ))}
          </optgroup>
          <optgroup label="Tablet">
            {PRESETS.slice(4, 7).map((p) => (
              <option key={p.label} value={p.label}>
                {p.label} ({p.width}&times;{p.height})
              </option>
            ))}
          </optgroup>
          <optgroup label="Desktop">
            {PRESETS.slice(7).map((p) => (
              <option key={p.label} value={p.label}>
                {p.label} ({p.width}&times;{p.height})
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      <div className={styles.sep} />

      {/* 너비/높이 */}
      <div className={styles.row}>
        <span className={styles.label}>{t("canvas.width")}</span>
        <input
          className={styles.input}
          type="number"
          value={usableW}
          onChange={handleWidthChange}
          min={1}
        />
        <span className={styles.unit}>px</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>{t("canvas.height")}</span>
        <input
          className={styles.input}
          type="number"
          value={usableH}
          onChange={handleHeightChange}
          min={1}
        />
        <span className={styles.unit}>px</span>
      </div>

      {/* 캔버스 잠금 */}
      <label className={styles.checkRow}>
        <input
          type="checkbox"
          checked={canvasLocked}
          onChange={(e) => setViewSetting("canvasLocked", e.target.checked)}
        />
        {t("canvas.lockSize")}
      </label>

      <div className={styles.sep} />

      {/* 폰트 크기 */}
      <div className={styles.row}>
        <span className={styles.label}>{t("canvas.fontSize")}</span>
        <input
          className={styles.input}
          type="number"
          value={fontSize}
          onChange={handleFontSizeChange}
          min={1}
          max={48}
        />
        <span className={styles.unit}>px</span>
      </div>

      {/* 행간 + 잠금 */}
      <div className={styles.row}>
        <span className={styles.label}>{t("canvas.lineHeight")}</span>
        <input
          className={styles.input}
          type="number"
          value={lineHeight}
          onChange={handleLineHeightChange}
          min={1}
          max={96}
          disabled={lhLocked}
        />
        <span className={styles.unit}>px</span>
        <button
          className={`${styles.linkBtn} ${lhLocked ? styles.linkBtnActive : ""}`}
          onClick={toggleLhLock}
          title={lhLocked ? "Unlock line height" : "Lock to font size ratio"}
        >
          {lhLocked ? <Link size={10} /> : <Unlink size={10} />}
        </button>
      </div>
    </div>
  );
}
