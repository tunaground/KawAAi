import { useState, useRef, useEffect, forwardRef } from "react";
import { ChevronDown, Plus, Image } from "lucide-react";
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
  const t = useI18n((s) => s.t);

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

  // ── 드래그 정렬 ──
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

      // 아이템 위치 캐시 (드래그 중 위치 변경 없으므로 한 번만)
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

      // 드래그 대상 흐리게
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
      // 흐림 해제
      cached.forEach(({ el }) => el.classList.remove(layerItemStyles.draggingItem));

      // 드롭 대상 찾기
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
          // undo snapshot
          saveUndoSnapshot();

          // 리스트는 역순으로 표시되므로 above/below가 반전됨
          // 리스트에서 "above" = 시각적으로 위 = 배열에서 더 높은 index
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
      <div className={`${styles.section} ${sectionsCollapsed.layers ? styles.collapsed : ""}`}>
        <div className={styles.sectionHeader} onClick={() => toggleSection("layers")}>
          <div className={styles.sectionTitle}>
            <ChevronDown size={12} className={styles.toggle} />
            <span>레이어</span>
          </div>
          <div className={styles.sectionActions} onClick={(e) => e.stopPropagation()}>
            <button className={styles.sectionBtn} onClick={addTextLayer} title="텍스트 레이어 추가">
              <Plus size={12} />
            </button>
            <button className={styles.sectionBtn} title="이미지 레이어 추가">
              <Image size={12} />
            </button>
          </div>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.layerList} ref={layerListRef}>
            {/* 역순: 맨 위 레이어가 리스트 최상단 */}
            {[...layers].reverse().map((layer) => (
              <LayerItem key={layer.id} layer={layer} />
            ))}
          </div>
        </div>
      </div>

      {/* 팔레트 섹션 */}
      <div className={`${styles.section} ${sectionsCollapsed.palette ? styles.collapsed : ""}`}>
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
      <div className={`${styles.section} ${sectionsCollapsed.library ? styles.collapsed : ""}`}>
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
