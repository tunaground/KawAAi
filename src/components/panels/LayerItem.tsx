import { memo, useState, useRef } from "react";
import { GripVertical, Eye, EyeOff, Lock, Unlock, Trash2, SlidersHorizontal, Image } from "lucide-react";
import { useProjectStore } from "../../stores/projectStore";
import { saveUndoSnapshot } from "../../stores/projectStore";
import { useI18n } from "../../i18n";
import { LayerPropsPopover } from "./LayerPropsPopover";
import type { Layer } from "../../types/project";
import styles from "./LayerItem.module.css";

interface LayerItemProps {
  layer: Layer;
}

export const LayerItem = memo(function LayerItem({ layer }: LayerItemProps) {
  const t = useI18n((s) => s.t);
  const activeLayerId = useProjectStore((s) => s.activeLayerId);
  const selectedLayerIds = useProjectStore((s) => s.selectedLayerIds);
  const setActiveLayer = useProjectStore((s) => s.setActiveLayer);
  const updateLayer = useProjectStore((s) => s.updateLayer);
  const removeLayer = useProjectStore((s) => s.removeLayer);

  const isActive = layer.id === activeLayerId;
  const isSelected = selectedLayerIds.has(layer.id) && !isActive;
  const [editing, setEditing] = useState(false);
  const [propsOpen, setPropsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const propsBtnRef = useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-action]")) return;
    if ((e.target as HTMLElement).closest(`.${styles.dragHandle}`)) return;
    if ((e.target as HTMLElement).closest("input")) return;
    const modifier = (e.ctrlKey || e.metaKey) ? "ctrl" : e.shiftKey ? "shift" : null;
    if (modifier || layer.id !== activeLayerId) {
      setActiveLayer(layer.id, modifier);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-action]")) return;
    if ((e.target as HTMLElement).closest(`.${styles.dragHandle}`)) return;
    if ((e.target as HTMLElement).closest("input[type=color]")) return;
    setEditing(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  };

  const commitRename = () => {
    const val = inputRef.current?.value.trim();
    if (val) { saveUndoSnapshot(); updateLayer(layer.id, { name: val }); }
    setEditing(false);
  };

  return (
    <div
      className={`${styles.item} ${isActive ? styles.active : ""} ${isSelected ? styles.selected : ""}`}
      data-layer-id={layer.id}
      onMouseDown={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <div className={styles.dragHandle} data-action="drag">
        <GripVertical size={12} />
      </div>

      {layer.type === "image" ? (
        <div className={styles.imageSwatch}><Image size={14} /></div>
      ) : (
        <input
          type="color"
          className={styles.colorSwatch}
          value={layer.textColor}
          onFocus={() => saveUndoSnapshot()}
          onChange={(e) => updateLayer(layer.id, { textColor: e.target.value })}
          onMouseDown={(e) => e.stopPropagation()}
          title={t("layer.textColor")}
        />
      )}

      {editing ? (
        <input
          ref={inputRef}
          className={styles.nameInput}
          defaultValue={layer.name}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commitRename(); }
            if (e.key === "Escape") setEditing(false);
          }}
          onMouseDown={(e) => e.stopPropagation()}
        />
      ) : (
        <span className={styles.name}>{layer.name}</span>
      )}

      <button
        ref={propsBtnRef}
        className={styles.btn}
        data-action="props"
        onMouseDown={(e) => {
          e.stopPropagation();
          setPropsOpen(!propsOpen);
        }}
        title={t("layer.properties")}
      >
        <SlidersHorizontal size={11} />
      </button>

      <button
        className={styles.btn}
        data-action="lock"
        onMouseDown={(e) => {
          e.stopPropagation();
          saveUndoSnapshot(); updateLayer(layer.id, { locked: !layer.locked });
        }}
        title={t("layer.lock")}
      >
        {layer.locked ? <Lock size={11} /> : <Unlock size={11} />}
      </button>

      <button
        className={styles.btn}
        data-action="visibility"
        onMouseDown={(e) => {
          e.stopPropagation();
          saveUndoSnapshot(); updateLayer(layer.id, { visible: !layer.visible });
        }}
        title={t("layer.visible")}
      >
        {layer.visible ? <Eye size={11} /> : <EyeOff size={11} />}
      </button>

      <button
        className={styles.btn}
        data-action="delete"
        onMouseDown={(e) => {
          e.stopPropagation();
          saveUndoSnapshot(); removeLayer(layer.id);
        }}
        title={t("layer.delete")}
      >
        <Trash2 size={11} />
      </button>

      {propsOpen && propsBtnRef.current && (
        <LayerPropsPopover
          layer={layer}
          anchorRect={propsBtnRef.current.getBoundingClientRect()}
          onClose={() => setPropsOpen(false)}
        />
      )}
    </div>
  );
});
