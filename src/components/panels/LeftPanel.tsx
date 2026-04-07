import { useState, useRef, useEffect, forwardRef } from "react";
import { ChevronDown, Plus, Image, Eye, EyeOff, Lock, Unlock } from "lucide-react";
import { useProjectStore, saveUndoSnapshot } from "../../stores/projectStore";
import { useConfigStore } from "../../stores/configStore";
import { useI18n } from "../../i18n";
import { LayerItem } from "./LayerItem";
import { PaletteSection } from "./PaletteSection";
import { MltSection } from "./MltSection";
import styles from "./LeftPanel.module.css";
import layerItemStyles from "./LayerItem.module.css";

const DEFAULT_HEIGHTS = { layers: 200, palette: 150, library: 250 };

export const LeftPanel = forwardRef<HTMLDivElement>(function LeftPanel(_props, ref) {
  const savedSections = useConfigStore((s) => s.config.sectionsCollapsed);
  const savedHeights = useConfigStore((s) => s.config.sectionHeights);
  const [sectionsCollapsed, setSectionsCollapsed] = useState(
    savedSections ?? { layers: false, palette: true, library: true }
  );
  const [sectionHeights, setSectionHeights] = useState(
    savedHeights ?? DEFAULT_HEIGHTS
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

  // ── 섹션 리사이즈 드래그 ──
  // 리사이즈 핸들은 위 섹션과 아래 섹션을 연동: 위를 늘리면 아래가 줄어듦
  const MIN_HEIGHT = 60;
  type SectionKey = "layers" | "palette" | "library";
  const sectionResizeRef = useRef<{
    upperKey: SectionKey;
    lowerKey: SectionKey;
    startY: number;
    startUpperH: number;
    startLowerH: number;
  } | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!sectionResizeRef.current) return;
      const { upperKey, lowerKey, startY, startUpperH, startLowerH } = sectionResizeRef.current;
      const dy = e.clientY - startY;
      const total = startUpperH + startLowerH;

      let upperH = startUpperH + dy;
      let lowerH = total - upperH;

      // 클램프
      if (upperH < MIN_HEIGHT) { upperH = MIN_HEIGHT; lowerH = total - upperH; }
      if (lowerH < MIN_HEIGHT) { lowerH = MIN_HEIGHT; upperH = total - lowerH; }

      setSectionHeights((prev) => ({ ...prev, [upperKey]: upperH, [lowerKey]: lowerH }));
    };
    const onUp = () => {
      if (sectionResizeRef.current) {
        sectionResizeRef.current = null;
        setSectionHeights((cur) => {
          useConfigStore.getState().updateConfig({ sectionHeights: cur });
          return cur;
        });
      }
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []);

  const startSectionResize = (upperKey: SectionKey, lowerKey: SectionKey) => (e: React.MouseEvent) => {
    e.preventDefault();
    sectionResizeRef.current = {
      upperKey,
      lowerKey,
      startY: e.clientY,
      startUpperH: sectionHeights[upperKey],
      startLowerH: sectionHeights[lowerKey],
    };
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
      <div
        className={`${styles.section} ${sectionsCollapsed.layers ? styles.collapsed : ""}`}
        style={sectionsCollapsed.layers ? undefined : { flex: 1 }}
      >
        <div className={styles.sectionHeader} onClick={() => toggleSection("layers")}>
          <div className={styles.sectionTitle}>
            <ChevronDown size={12} className={styles.toggle} />
            <span>{t("layer.title")}</span>
          </div>
          <div className={styles.sectionActions} onClick={(e) => e.stopPropagation()}>
            <button className={styles.layerHeaderBtn} title={t("layer.addImage")}><Image size={11} /></button>
            <button className={styles.layerHeaderBtn} onClick={toggleAllLocked} title={allLocked ? t("layer.unlock") : t("layer.lock")}>
              {allLocked ? <Lock size={11} /> : <Unlock size={11} />}
            </button>
            <button className={styles.layerHeaderBtn} onClick={toggleAllVisible} title={noneVisible ? t("layer.visible") : t("layer.hidden")}>
              {noneVisible ? <EyeOff size={11} /> : <Eye size={11} />}
            </button>
            <button className={styles.layerHeaderBtn} onClick={addTextLayer} title={t("layer.addText")}><Plus size={11} /></button>
          </div>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.layerList} ref={layerListRef}>
            {[...layers].reverse().map((layer) => (
              <LayerItem key={layer.id} layer={layer} />
            ))}
          </div>
        </div>
      </div>

      {/* 하단 블록 리사이즈 핸들 */}
      <div className={styles.sectionResize} onMouseDown={startSectionResize("layers", "palette")} />

      {/* 하단 블록: 팔레트 + 라이브러리 */}
      <div className={styles.bottomBlock} style={
        sectionsCollapsed.palette && sectionsCollapsed.library
          ? undefined
          : { height: sectionHeights.palette + sectionHeights.library }
      }>
        {/* 팔레트 섹션 — flex:1로 라이브러리가 접히면 늘어남 */}
        <div
          className={`${styles.section} ${sectionsCollapsed.palette ? styles.collapsed : ""}`}
          style={sectionsCollapsed.palette ? undefined : { flex: 1 }}
        >
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

        {/* 라이브러리 리사이즈 핸들 */}
        {!sectionsCollapsed.palette && !sectionsCollapsed.library && (
          <div className={styles.sectionResize} onMouseDown={startSectionResize("palette", "library")} />
        )}

        {/* 라이브러리(MLT) 섹션 */}
        <div
          className={`${styles.section} ${sectionsCollapsed.library ? styles.collapsed : ""}`}
          style={sectionsCollapsed.library ? undefined : { height: sectionHeights.library }}
        >
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
    </div>
  );
});
