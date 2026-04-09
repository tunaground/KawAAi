import { useRef, useEffect } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { saveUndoSnapshot } from "../../stores/projectStore";
import { useI18n } from "../../i18n";
import type { Layer } from "../../types/project";
import styles from "./LayerPropsPopover.module.css";

interface Props {
  layer: Layer;
  anchorRect: DOMRect;
  onClose: () => void;
}

export function LayerPropsPopover({ layer, anchorRect, onClose }: Props) {
  const updateLayer = useProjectStore((s) => s.updateLayer);
  const t = useI18n((s) => s.t);
  const popoverRef = useRef<HTMLDivElement>(null);
  const undoSaved = useRef(false);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [onClose]);

  const ensureUndo = () => {
    if (!undoSaved.current) {
      saveUndoSnapshot();
      undoSaved.current = true;
    }
  };

  const left = anchorRect.right + 4;
  const top = anchorRect.top;

  return (
    <div ref={popoverRef} className={styles.popover} style={{ left, top }}>
      <div className={styles.row}>
        <span className={styles.label}>{t("layer.opacity")}</span>
        <input
          type="range"
          className={styles.slider}
          min={0}
          max={1}
          step={0.01}
          value={layer.opacity}
          onMouseDown={ensureUndo}
          onChange={(e) => updateLayer(layer.id, { opacity: parseFloat(e.target.value) })}
          onMouseUp={() => { undoSaved.current = false; }}
        />
        <span className={styles.value}>{Math.round(layer.opacity * 100)}%</span>
      </div>

      {layer.type === "image" && (
        <div className={styles.row}>
          <span className={styles.label}>{t("layer.saturation")}</span>
          <input
            type="range"
            className={styles.slider}
            min={0}
            max={2}
            step={0.01}
            value={layer.saturation}
            onMouseDown={ensureUndo}
            onChange={(e) => updateLayer(layer.id, { saturation: parseFloat(e.target.value) })}
            onMouseUp={() => { undoSaved.current = false; }}
          />
          <span className={styles.value}>{Math.round(layer.saturation * 100)}%</span>
        </div>
      )}
    </div>
  );
}
