import { useState, useRef, useEffect, forwardRef } from "react";
import { ChevronDown, Plus, Image, Eye, EyeOff, Lock, Unlock, MoreVertical } from "lucide-react";
import { showConfirmModal } from "../modals/InputModal";
import { useProjectStore, saveUndoSnapshot } from "../../stores/projectStore";
import { useConfigStore } from "../../stores/configStore";
import { useI18n } from "../../i18n";
import { LayerItem } from "./LayerItem";
import { PaletteSection } from "./PaletteSection";
import { MltSection } from "./MltSection";
import styles from "./LeftPanel.module.css";
import layerItemStyles from "./LayerItem.module.css";

export const LeftPanel = forwardRef<HTMLDivElement>(function LeftPanel(_props, ref) {
  const savedSections = useConfigStore((s) => s.config.sectionsCollapsed);
  const [sectionsCollapsed, setSectionsCollapsed] = useState(
    savedSections ?? { layers: false, palette: true, library: true }
  );

  const layers = useProjectStore((s) => s.layers);
  const moveLayerOrder = useProjectStore((s) => s.moveLayerOrder);
  const createLayer = useProjectStore((s) => s.createLayer);
  const updateLayer = useProjectStore((s) => s.updateLayer);
  const t = useI18n((s) => s.t);

  const allVisible = layers.length > 0 && layers.every((l) => l.visible);
  const noneVisible = layers.length > 0 && layers.every((l) => !l.visible);
  const allLocked = layers.length > 0 && layers.every((l) => l.locked);

  const toggleAllVisible = () => {
    saveUndoSnapshot();
    const newVal = !allVisible;
    layers.forEach((l) => updateLayer(l.id, { visible: newVal }));
  };
  const toggleAllLocked = () => {
    saveUndoSnapshot();
    const newVal = !allLocked;
    layers.forEach((l) => updateLayer(l.id, { locked: newVal }));
  };

  const removeLayer = useProjectStore((s) => s.removeLayer);
  const selectedLayerIds = useProjectStore((s) => s.selectedLayerIds);

  // 레이어 ... 메뉴
  const [layerMenuOpen, setLayerMenuOpen] = useState(false);
  const layerMenuBtnRef = useRef<HTMLDivElement>(null);
  const layerMenuRef = useRef<HTMLDivElement>(null);
  const [layerMenuPos, setLayerMenuPos] = useState({ left: 0, top: 0 });

  useEffect(() => {
    if (!layerMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (layerMenuBtnRef.current?.contains(e.target as Node)) return;
      if (layerMenuRef.current?.contains(e.target as Node)) return;
      setLayerMenuOpen(false);
    };
    document.addEventListener("mouseup", handler);
    return () => document.removeEventListener("mouseup", handler);
  }, [layerMenuOpen]);

  const handleLayerMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = layerMenuBtnRef.current?.getBoundingClientRect();
    if (rect) setLayerMenuPos({ left: rect.right + 4, top: rect.top });
    setLayerMenuOpen(!layerMenuOpen);
  };

  const handleDeleteSelectedLayers = async () => {
    setLayerMenuOpen(false);
    if (selectedLayerIds.size === 0) return;
    const ok = await showConfirmModal(
      `${selectedLayerIds.size}${t("layer.deleteSelectedConfirm")}`,
      t("modal.delete"),
      "danger"
    );
    if (ok) {
      saveUndoSnapshot();
      for (const id of [...selectedLayerIds]) removeLayer(id);
    }
  };

  const layerListRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ layerId: number } | null>(null);
  const dragItemsCache = useRef<{ id: number; el: HTMLElement; top: number; bottom: number; midY: number }[]>([]);

  const toggleSection = (key: keyof typeof sectionsCollapsed) => {
    setSectionsCollapsed((s) => {
      const next = { ...s, [key]: !s[key] };
      useConfigStore.getState().updateConfig({ sectionsCollapsed: next });
      return next;
    });
  };

  const addTextLayer = () => {
    const offset = layers.length * 30;
    createLayer("", 20 + offset, 20 + offset, 250, 120);
  };

  const imageInputRef = useRef<HTMLInputElement>(null);
  const addImageLayer = () => imageInputRef.current?.click();
  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        const offset = layers.length * 30;
        createLayer("", 20 + offset, 20 + offset, img.naturalWidth, img.naturalHeight, {
          type: "image",
          imageSrc: src,
        });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };


  // ── 레이어 드래그 정렬 ──
  useEffect(() => {
    const listEl = layerListRef.current;
    if (!listEl) return;

    const onMouseDown = (e: MouseEvent) => {
      const handle = (e.target as HTMLElement).closest(`[data-action="drag"]`);
      if (!handle) return;
      const item = handle.closest(`[data-layer-id]`) as HTMLElement;
      if (!item) return;
      e.preventDefault();

      const layerId = parseInt(item.dataset.layerId!);
      dragRef.current = { layerId };

      const items = listEl.querySelectorAll(`[data-layer-id]`);
      dragItemsCache.current = Array.from(items).map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          id: parseInt((el as HTMLElement).dataset.layerId!),
          el: el as HTMLElement,
          top: rect.top,
          bottom: rect.bottom,
          midY: rect.top + rect.height / 2,
        };
      });

      const store = useProjectStore.getState();
      const moveIds = store.selectedLayerIds.has(layerId) ? store.selectedLayerIds : new Set([layerId]);
      dragItemsCache.current.forEach(({ id, el }) => {
        if (moveIds.has(id)) el.classList.add(layerItemStyles.draggingItem);
      });
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;

      const cached = dragItemsCache.current;
      for (const item of cached) {
        item.el.classList.remove(layerItemStyles.dragOverAbove, layerItemStyles.dragOverBelow);
      }

      for (const item of cached) {
        if (item.id === dragRef.current.layerId) continue;
        if (e.clientY >= item.top && e.clientY <= item.bottom) {
          if (e.clientY < item.midY) {
            item.el.classList.add(layerItemStyles.dragOverAbove);
          } else {
            item.el.classList.add(layerItemStyles.dragOverBelow);
          }
          break;
        }
      }
    };

    const onMouseUp = () => {
      if (!dragRef.current) return;

      const cached = dragItemsCache.current;
      cached.forEach(({ el }) => el.classList.remove(layerItemStyles.draggingItem));

      let target: HTMLElement | null = null;
      for (const item of cached) {
        if (item.el.classList.contains(layerItemStyles.dragOverAbove) ||
            item.el.classList.contains(layerItemStyles.dragOverBelow)) {
          target = item.el;
          break;
        }
      }

      if (target) {
        const isAbove = target.classList.contains(layerItemStyles.dragOverAbove);
        const targetId = parseInt(target.dataset.layerId!);
        target.classList.remove(layerItemStyles.dragOverAbove, layerItemStyles.dragOverBelow);

        const store = useProjectStore.getState();
        const moveIds = store.selectedLayerIds.has(dragRef.current.layerId)
          ? new Set(store.selectedLayerIds)
          : new Set([dragRef.current.layerId]);

        if (!moveIds.has(targetId)) {
          saveUndoSnapshot();
          moveLayerOrder(moveIds, targetId, isAbove ? "above" : "below");
        }
      }

      dragRef.current = null;
      dragItemsCache.current = [];
    };

    listEl.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      listEl.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [moveLayerOrder]);

  return (
    <div className={styles.leftPanel} ref={ref}>
      {/* 레이어 섹션 */}
      <div className={`${styles.section} ${styles.flexSection} ${sectionsCollapsed.layers ? styles.collapsed : ""}`}>
        <div className={styles.sectionHeader} onClick={() => toggleSection("layers")}>
          <div className={styles.sectionTitle}>
            <ChevronDown size={12} className={styles.toggle} />
            <span>{t("layer.title")}</span>
          </div>
          <div className={styles.sectionActions} onClick={(e) => e.stopPropagation()}>
            <button className={styles.layerHeaderBtn} onClick={addTextLayer} title={t("layer.addText")}><Plus size={11} /></button>
            <button className={styles.layerHeaderBtn} onClick={addImageLayer} title={t("layer.addImage")}><Image size={11} /></button>
            <input ref={imageInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageFile} />
            <button className={styles.layerHeaderBtn} onClick={toggleAllLocked} title={allLocked ? t("layer.unlock") : t("layer.lock")}>
              {allLocked ? <Lock size={11} /> : <Unlock size={11} />}
            </button>
            <button className={styles.layerHeaderBtn} onClick={toggleAllVisible} title={noneVisible ? t("layer.visible") : t("layer.hidden")}>
              {noneVisible ? <EyeOff size={11} /> : <Eye size={11} />}
            </button>
            <div className={styles.layerMenuBtn} ref={layerMenuBtnRef} onMouseDown={handleLayerMenu}>
              <MoreVertical size={11} />
            </div>
          </div>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.layerList} ref={layerListRef}>
            {[...layers].reverse().map((layer) => (
              <LayerItem key={layer.id} layer={layer} />
            ))}
          </div>
        </div>

        {layerMenuOpen && (
          <div ref={layerMenuRef} className={styles.layerMenu} style={{ left: layerMenuPos.left, top: layerMenuPos.top }}>
            {selectedLayerIds.size > 0 && (
              <div className={styles.layerMenuItem} onClick={handleDeleteSelectedLayers} style={{ color: "#f44" }}>
                {t("layer.deleteSelected")} ({selectedLayerIds.size})
              </div>
            )}
            {selectedLayerIds.size === 0 && (
              <div className={styles.layerMenuDisabled}>{t("layer.noSelection")}</div>
            )}
          </div>
        )}
      </div>

      {/* 팔레트 섹션 */}
      <div className={`${styles.section} ${styles.flexSection} ${sectionsCollapsed.palette ? styles.collapsed : ""}`}>
        <div className={styles.sectionHeader} onClick={() => toggleSection("palette")}>
          <div className={styles.sectionTitle}>
            <ChevronDown size={12} className={styles.toggle} />
            <span>{t("palette.title")}</span>
          </div>
        </div>
        <div className={styles.sectionBody}>
          <PaletteSection />
        </div>
      </div>

      {/* 라이브러리(MLT) 섹션 */}
      <div className={`${styles.section} ${styles.flexSection} ${sectionsCollapsed.library ? styles.collapsed : ""}`}>
        <div className={styles.sectionHeader} onClick={() => toggleSection("library")}>
          <div className={styles.sectionTitle}>
            <ChevronDown size={12} className={styles.toggle} />
            <span>{t("mlt.title")}</span>
          </div>
        </div>
        <div className={styles.sectionBody}>
          <MltSection />
        </div>
      </div>
    </div>
  );
});
