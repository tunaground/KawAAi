import { useState, useRef } from "react";
import {
  FolderOpen, Save, Merge, PenTool, Magnet,
  Grid3x3, LetterText, Settings, Paintbrush, BookOpen, FileDown, FilePlus, Scaling, Ruler, Minimize2,
  BoxSelect, Square, Brush, XCircle, PaintbrushVertical, PaintBucket, Stamp,
} from "lucide-react";
import { useProjectStore } from "../../stores/projectStore";
import { type EditorMode, saveUndoSnapshot, setStatus } from "../../stores/projectStore";
import { useI18n } from "../../i18n";
import { CanvasSettingsPopover } from "./CanvasSettingsPopover";
import { optimizeLayerSpaces } from "../../lib/spaceOptimizer";
import { mergeOpaqueRanges, subtractOpaqueRanges } from "../../lib/opaqueRangeUtils";
import { usePaletteStore } from "../../stores/paletteStore";
import { showInputModal } from "../modals/InputModal";
import { compositeLayers } from "../../lib/compositor";
import styles from "./Header.module.css";

interface HeaderProps {
  onOpenQuickEdit: () => void;
  onOpenSettings: () => void;
  onNewProject: () => void;
  onSave: () => void;
  onOpen: () => void;
  onMerge: () => void;
  onExportMLT: () => void;
  onOpenManual: () => void;
}

export function Header({ onOpenQuickEdit, onOpenSettings, onNewProject, onSave, onOpen, onMerge, onExportMLT, onOpenManual }: HeaderProps) {
  const snapEnabled = useProjectStore((s) => s.viewSettings.snapEnabled);
  const gridVisible = useProjectStore((s) => s.viewSettings.gridVisible);
  const charGridEnabled = useProjectStore((s) => s.viewSettings.charGridEnabled);
  const rulerUnit = useProjectStore((s) => s.viewSettings.rulerUnit);
  const setViewSetting = useProjectStore((s) => s.setViewSetting);
  const t = useI18n((s) => s.t);
  const editorMode = useProjectStore((s) => s.editorMode);
  const setEditorMode = useProjectStore((s) => s.setEditorMode);
  const projectPath = useProjectStore((s) => s.projectPath);
  const lastSavedAt = useProjectStore((s) => s.lastSavedAt);

  const blockSelectTool = useProjectStore((s) => s.blockSelectTool);
  const setBlockSelectTool = useProjectStore((s) => s.setBlockSelectTool);
  const clearBlockSelection = useProjectStore((s) => s.clearBlockSelection);
  const updateLayer = useProjectStore((s) => s.updateLayer);
  const boxAutoOpaque = useProjectStore((s) => s.boxAutoOpaque);
  const setBoxAutoOpaque = useProjectStore((s) => s.setBoxAutoOpaque);

  const activePalette = usePaletteStore((s) => {
    const pal = s.paletteSet.palettes[s.activePaletteIndex];
    return pal ?? null;
  });
  const addStamp = usePaletteStore((s) => s.addStamp);
  const isStampPalette = activePalette?.type === "stamp";

  const [canvasSettingsOpen, setCanvasSettingsOpen] = useState(false);
  const canvasSettingsBtnRef = useRef<HTMLButtonElement>(null);

  const toggleMode = (mode: EditorMode) => {
    setEditorMode(editorMode === mode ? "normal" : mode);
  };

  const handleOptimizeSpaces = () => {
    const store = useProjectStore.getState();
    const targets = store.layers.filter(
      (l) => l.type === "text" && store.selectedLayerIds.has(l.id)
    );
    if (targets.length === 0) {
      setStatus(t("header.optimizeNoSelection"));
      return;
    }
    saveUndoSnapshot();
    let count = 0;
    for (const layer of targets) {
      const result = optimizeLayerSpaces(layer.text, store.fontSize, layer.opaqueRanges);
      if (result.text !== layer.text) {
        store.updateLayer(layer.id, { text: result.text, opaqueRanges: result.opaqueRanges });
        count++;
      }
    }
    setStatus(count > 0
      ? `${count}${t("header.optimizeDone")}`
      : t("header.optimizeNoop")
    );
  };

  const isBlockMode = editorMode === "blockSelect";

  const handleApplyOpaque = () => {
    const store = useProjectStore.getState();
    if (store.blockSelection.length === 0 || store.activeLayerId === null) return;
    const layer = store.layers.find(l => l.id === store.activeLayerId);
    if (!layer || layer.type !== "text") return;
    saveUndoSnapshot();
    const merged = mergeOpaqueRanges([...layer.opaqueRanges, ...store.blockSelection]);
    updateLayer(layer.id, { opaqueRanges: merged });
  };

  const handleRemoveOpaque = () => {
    const store = useProjectStore.getState();
    if (store.blockSelection.length === 0 || store.activeLayerId === null) return;
    const layer = store.layers.find(l => l.id === store.activeLayerId);
    if (!layer || layer.type !== "text") return;
    saveUndoSnapshot();
    const erased = subtractOpaqueRanges(layer.opaqueRanges, store.blockSelection);
    updateLayer(layer.id, { opaqueRanges: erased });
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerTop}>
        <h1 className={styles.title}>KawAAi <span className={styles.version}>v0.5.0</span></h1>

        <div className={styles.toolbar}>
          {/* 파일 */}
          <button className={styles.btn} onClick={onNewProject} title={t("header.newProject")}>
            <FilePlus size={16} />
          </button>
          <button className={styles.btn} onClick={onOpen} title={t("header.open")}>
            <FolderOpen size={16} />
          </button>
          <button className={styles.btn} onClick={onSave} title={t("header.save")}>
            <Save size={16} />
          </button>
          <button
            className={styles.btn}
            disabled={!isStampPalette}
            onClick={async () => {
              const store = useProjectStore.getState();
              const lines = compositeLayers(store.layers, store.fontSize, store.lineHeight);
              if (lines.length === 0) { setStatus(t("header.saveAsStampEmpty")); return; }
              const text = lines.join("\n");
              const name = await showInputModal(t("stamp.namePrompt"));
              if (!name) return;
              addStamp({ name, text });
              setStatus(t("stamp.added"));
            }}
            title={isStampPalette ? t("header.saveAsStamp") : t("header.saveAsStampHint")}
          >
            <Stamp size={16} />
          </button>
          <button className={styles.btn} onClick={onExportMLT} title={t("header.exportMLT")}>
            <FileDown size={16} />
          </button>

          <div className={styles.separator} />

          {/* 레이어 도구 */}
          <button className={styles.btn} onClick={onMerge} title={t("header.merge")}>
            <Merge size={16} />
          </button>
          <button className={styles.btn} onClick={onOpenQuickEdit} title={t("header.quickEdit")}>
            <PenTool size={16} />
          </button>
          <button className={styles.btn} onClick={handleOptimizeSpaces} title={t("header.optimizeSpaces")}>
            <Minimize2 size={16} />
          </button>

          <div className={styles.separator} />

          {/* 뷰 설정 */}
          <button
            className={`${styles.btn} ${snapEnabled ? styles.active : ""}`}
            onClick={() => setViewSetting("snapEnabled", !snapEnabled)}
            title={t("header.snap")}
          >
            <Magnet size={16} />
          </button>
          <button
            className={`${styles.btn} ${gridVisible ? styles.active : ""}`}
            onClick={() => setViewSetting("gridVisible", !gridVisible)}
            title={t("header.grid")}
          >
            <Grid3x3 size={16} />
          </button>
          <button
            className={`${styles.btn} ${charGridEnabled ? styles.active : ""}`}
            onClick={() => setViewSetting("charGridEnabled", !charGridEnabled)}
            title={t("header.charGrid")}
          >
            <LetterText size={16} />
          </button>
          <button
            ref={canvasSettingsBtnRef}
            className={styles.btn}
            onClick={() => setCanvasSettingsOpen(!canvasSettingsOpen)}
            title={t("header.canvasSettings")}
          >
            <Scaling size={16} />
          </button>
          <button
            className={styles.btn}
            onClick={() => setViewSetting("rulerUnit", rulerUnit === "px" ? "mm" : "px")}
            title={t("header.rulerUnit")}
          >
            <Ruler size={16} />
            <span className={styles.btnBadge}>{rulerUnit}</span>
          </button>

          <div className={styles.separator} />

          <button className={styles.btn} onClick={onOpenManual} title={t("header.manual")}>
            <BookOpen size={16} />
          </button>
          <button className={styles.btn} onClick={onOpenSettings} title={t("settings.title")}>
            <Settings size={16} />
          </button>
        </div>

        <div className={styles.fileInfo}>
          <span className={styles.filePath}>
            {projectPath
              ? projectPath.split("/").pop()?.split("\\").pop()
              : t("status.newProject")}
          </span>
          {lastSavedAt && (
            <span className={styles.savedAt}>{t("status.saved")}: {lastSavedAt}</span>
          )}
        </div>
      </div>

      <div className={styles.headerBottom}>
        <div className={styles.toolbar}>
          {/* 블록 편집 활성화 토글 */}
          <button
            className={`${styles.btn} ${isBlockMode ? styles.active : ""}`}
            onClick={() => toggleMode("blockSelect")}
            title={t("header.blockSelect")}
          >
            <BoxSelect size={16} />
          </button>

          <div className={styles.separator} />

          {/* 선택 도구 */}
          <button
            className={`${styles.btn} ${isBlockMode && blockSelectTool === "rect" ? styles.active : ""}`}
            onClick={() => setBlockSelectTool("rect")}
            disabled={!isBlockMode}
            title={t("header.blockSelectRect")}
          >
            <Square size={16} />
          </button>
          <button
            className={`${styles.btn} ${isBlockMode && blockSelectTool === "brush" ? styles.active : ""}`}
            onClick={() => setBlockSelectTool("brush")}
            disabled={!isBlockMode}
            title={t("header.blockSelectBrush")}
          >
            <Brush size={16} />
          </button>

          <div className={styles.separator} />

          {/* 액션 */}
          <button
            className={styles.btn}
            onClick={handleApplyOpaque}
            disabled={!isBlockMode}
            title={t("header.opaquePaint")}
          >
            <Paintbrush size={16} />
          </button>
          <button
            className={styles.btn}
            onClick={handleRemoveOpaque}
            disabled={!isBlockMode}
            title={t("header.opaqueErase")}
          >
            <PaintbrushVertical size={16} />
          </button>

          <div className={styles.separator} />

          <button
            className={styles.btn}
            onClick={clearBlockSelection}
            disabled={!isBlockMode}
            title={t("header.clearSelection")}
          >
            <XCircle size={16} />
          </button>

          <div className={styles.separator} />

          {/* 박스 자동 채색 토글 */}
          <button
            className={`${styles.btn} ${boxAutoOpaque ? styles.active : ""}`}
            onClick={() => setBoxAutoOpaque(!boxAutoOpaque)}
            title={t("header.boxAutoOpaque")}
          >
            <PaintBucket size={16} />
          </button>

        </div>
      </div>

      {canvasSettingsOpen && canvasSettingsBtnRef.current && (
        <CanvasSettingsPopover
          anchorRect={canvasSettingsBtnRef.current.getBoundingClientRect()}
          onClose={() => setCanvasSettingsOpen(false)}
        />
      )}
    </header>
  );
}
