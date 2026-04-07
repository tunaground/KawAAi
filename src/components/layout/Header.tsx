import {
  FolderOpen, Save, Merge, PenTool, Magnet,
  Grid3x3, LetterText, Settings, Paintbrush, Eraser, X, BookOpen,
} from "lucide-react";
import { useProjectStore } from "../../stores/projectStore";
import { type EditorMode } from "../../stores/projectStore";
import { useI18n } from "../../i18n";
import styles from "./Header.module.css";

interface HeaderProps {
  onOpenQuickEdit: () => void;
  onOpenSettings: () => void;
  onSave: () => void;
  onOpen: () => void;
  onMerge: () => void;
  onOpenManual: () => void;
}

export function Header({ onOpenQuickEdit, onOpenSettings, onSave, onOpen, onMerge, onOpenManual }: HeaderProps) {
  const snapEnabled = useProjectStore((s) => s.viewSettings.snapEnabled);
  const gridVisible = useProjectStore((s) => s.viewSettings.gridVisible);
  const charGridEnabled = useProjectStore((s) => s.viewSettings.charGridEnabled);
  const setViewSetting = useProjectStore((s) => s.setViewSetting);
  const t = useI18n((s) => s.t);
  const editorMode = useProjectStore((s) => s.editorMode);
  const setEditorMode = useProjectStore((s) => s.setEditorMode);
  const projectPath = useProjectStore((s) => s.projectPath);
  const lastSavedAt = useProjectStore((s) => s.lastSavedAt);

  const toggleMode = (mode: EditorMode) => {
    setEditorMode(editorMode === mode ? "normal" : mode);
  };

  return (
    <header className={styles.header}>
      <h1 className={styles.title}>KawAAi</h1>

      <div className={styles.toolbar}>
        {/* 파일 */}
        <button className={styles.btn} onClick={onOpen} title={t("header.open")}>
          <FolderOpen size={16} />
        </button>
        <button className={styles.btn} onClick={onSave} title={t("header.save")}>
          <Save size={16} />
        </button>

        <div className={styles.separator} />

        {/* 레이어 도구 */}
        <button className={styles.btn} onClick={onMerge} title={t("header.merge")}>
          <Merge size={16} />
        </button>
        <button className={styles.btn} onClick={onOpenQuickEdit} title={t("header.quickEdit")}>
          <PenTool size={16} />
        </button>

        <div className={styles.separator} />

        {/* 공백 채색 모드 */}
        <button
          className={`${styles.btn} ${editorMode === "opaquePaint" ? styles.active : ""}`}
          onClick={() => toggleMode("opaquePaint")}
          title="공백 채색"
        >
          <Paintbrush size={16} />
        </button>
        <button
          className={`${styles.btn} ${editorMode === "opaqueErase" ? styles.active : ""}`}
          onClick={() => toggleMode("opaqueErase")}
          title="공백 채색 제거"
        >
          <Eraser size={16} />
        </button>
        {editorMode !== "normal" && (
          <button
            className={styles.btn}
            onClick={() => setEditorMode("normal")}
            title="모드 취소"
          >
            <X size={16} />
          </button>
        )}

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
    </header>
  );
}
