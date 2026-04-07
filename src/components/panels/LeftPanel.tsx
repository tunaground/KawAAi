import { useState, useRef, useEffect, forwardRef } from "react";
import { ChevronDown, Plus, Image } from "lucide-react";
import { useProjectStore } from "../../stores/projectStore";
import { useEditorStore } from "../../stores/editorStore";
import { useI18n } from "../../i18n";
import { LayerItem } from "./LayerItem";
import { PaletteSection } from "./PaletteSection";
import { MltSection } from "./MltSection";
import styles from "./LeftPanel.module.css";
import layerItemStyles from "./LayerItem.module.css";

export const LeftPanel = forwardRef<HTMLDivElement>(function LeftPanel(_props, ref) {
  const [sectionsCollapsed, setSectionsCollapsed] = useState({
    layers: false,
    palette: true,
    library: true,
  });

  const layers = useProjectStore((s) => s.layers);
  const moveLayerOrder = useProjectStore((s) => s.moveLayerOrder);
  const createLayer = useProjectStore((s) => s.createLayer);
  const t = useI18n((s) => s.t);
  const pushUndo = useEditorStore((s) => s.pushUndo);

  const layerListRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ layerId: number } | null>(null);

  const toggleSection = (key: keyof typeof sectionsCollapsed) => {
    setSectionsCollapsed((s) => ({ ...s, [key]: !s[key] }));
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

      // 드래그 대상 흐리게
      const store = useProjectStore.getState();
      const moveIds = store.selectedLayerIds.has(layerId) ? store.selectedLayerIds : new Set([layerId]);
      listEl.querySelectorAll(`[data-layer-id]`).forEach((el) => {
        const id = parseInt((el as HTMLElement).dataset.layerId!);
        if (moveIds.has(id)) el.classList.add(layerItemStyles.draggingItem);
      });
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;

      // 표시 초기화
      listEl.querySelectorAll(`.${layerItemStyles.dragOverAbove}, .${layerItemStyles.dragOverBelow}`).forEach((el) => {
        el.classList.remove(layerItemStyles.dragOverAbove, layerItemStyles.dragOverBelow);
      });

      // 호버 대상 찾기
      const items = listEl.querySelectorAll(`[data-layer-id]`);
      for (const item of items) {
        const id = parseInt((item as HTMLElement).dataset.layerId!);
        if (id === dragRef.current.layerId) continue;
        const rect = item.getBoundingClientRect();
        if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
          const midY = rect.top + rect.height / 2;
          if (e.clientY < midY) {
            item.classList.add(layerItemStyles.dragOverAbove);
          } else {
            item.classList.add(layerItemStyles.dragOverBelow);
          }
          break;
        }
      }
    };

    const onMouseUp = () => {
      if (!dragRef.current) return;

      // 흐림 해제
      listEl.querySelectorAll(`.${layerItemStyles.draggingItem}`).forEach((el) => {
        el.classList.remove(layerItemStyles.draggingItem);
      });

      // 드롭 대상 찾기
      const target = listEl.querySelector(
        `.${layerItemStyles.dragOverAbove}, .${layerItemStyles.dragOverBelow}`
      ) as HTMLElement | null;

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
          pushUndo({
            layers: store.layers.map((l) => ({ ...l })),
            activeLayerId: store.activeLayerId,
            selectedLayerIds: [...store.selectedLayerIds],
            nextLayerId: store.nextLayerId,
          });

          // 리스트는 역순으로 표시되므로 above/below가 반전됨
          // 리스트에서 "above" = 시각적으로 위 = 배열에서 더 높은 index
          moveLayerOrder(moveIds, targetId, isAbove ? "above" : "below");
        }
      }

      dragRef.current = null;
    };

    listEl.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      listEl.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [moveLayerOrder, pushUndo]);

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
