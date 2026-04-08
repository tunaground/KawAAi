import { useState, useRef } from "react";
import {
  FolderOpen, Save, Merge, PenTool, Magnet,
  Grid3x3, LetterText, Settings, Paintbrush, BookOpen, FileDown, FilePlus, Scaling, Ruler, Minimize2,
} from "lucide-react";
import { useProjectStore } from "../../stores/projectStore";
import { type EditorMode, saveUndoSnapshot, setStatus } from "../../stores/projectStore";
import { useI18n } from "../../i18n";
import { CanvasSettingsPopover } from "./CanvasSettingsPopover";
import { optimizeLayerSpaces } from "../../lib/spaceOptimizer";
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

  return (
    <header className={styles.header}>
      <h1 className={styles.title}>KawAAi <span className={styles.version}>v0.4.1</span></h1>

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

        {/* 공백 채색 모드 (Shift+드래그로 제거) */}
        <button
          className={`${styles.btn} ${editorMode === "opaquePaint" ? styles.active : ""}`}
          onClick={() => toggleMode("opaquePaint")}
          title={t("header.opaquePaint")}
        >
          <Paintbrush size={16} />
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
      {canvasSettingsOpen && canvasSettingsBtnRef.current && (
        <CanvasSettingsPopover
          anchorRect={canvasSettingsBtnRef.current.getBoundingClientRect()}
          onClose={() => setCanvasSettingsOpen(false)}
        />
      )}
    </header>
  );
}
