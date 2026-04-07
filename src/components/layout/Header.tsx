import {
  FolderOpen, Save, Merge, PenTool, Magnet,
  Grid3x3, LetterText, Settings, Paintbrush, Eraser, X,
} from "lucide-react";
import { useProjectStore } from "../../stores/projectStore";
import { useEditorStore, type EditorMode } from "../../stores/editorStore";
import { useI18n } from "../../i18n";
import styles from "./Header.module.css";

interface HeaderProps {
  onOpenQuickEdit: () => void;
  onOpenSettings: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onOpen: () => void;
  onMerge: () => void;
}

export function Header({ onOpenQuickEdit, onOpenSettings, onSave, onSaveAs: _onSaveAs, onOpen, onMerge }: HeaderProps) {
  const viewSettings = useProjectStore((s) => s.viewSettings);
  const setViewSetting = useProjectStore((s) => s.setViewSetting);
  const t = useI18n((s) => s.t);
  const editorMode = useEditorStore((s) => s.editorMode);
  const setEditorMode = useEditorStore((s) => s.setEditorMode);

  const toggleMode = (mode: EditorMode) => {
    setEditorMode(editorMode === mode ? "normal" : mode);
  };

  return (
    <header className={styles.header}>
      <h1 className={styles.title}>KawAAi</h1>

      <div className={styles.toolbar}>
        {/* 파일 */}
        <button className={styles.btn} onClick={onOpen} title="열기 (Ctrl+O)">
          <FolderOpen size={16} />
        </button>
        <button className={styles.btn} onClick={onSave} title="저장 (Ctrl+S)">
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
          className={`${styles.btn} ${viewSettings.snapEnabled ? styles.active : ""}`}
          onClick={() => setViewSetting("snapEnabled", !viewSettings.snapEnabled)}
          title={t("header.snap")}
        >
          <Magnet size={16} />
        </button>
        <button
          className={`${styles.btn} ${viewSettings.gridVisible ? styles.active : ""}`}
          onClick={() => setViewSetting("gridVisible", !viewSettings.gridVisible)}
          title={t("header.grid")}
        >
          <Grid3x3 size={16} />
        </button>
        <button
          className={`${styles.btn} ${viewSettings.charGridEnabled ? styles.active : ""}`}
          onClick={() => setViewSetting("charGridEnabled", !viewSettings.charGridEnabled)}
          title={t("header.charGrid")}
        >
          <LetterText size={16} />
        </button>

        <div className={styles.separator} />

        <button className={styles.btn} onClick={onOpenSettings} title={t("settings.title")}>
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
}
