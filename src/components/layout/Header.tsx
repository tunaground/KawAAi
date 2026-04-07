import {
  FolderOpen, Save, Merge, PenTool, Magnet,
  Grid3x3, LetterText, Settings,
} from "lucide-react";
import { useProjectStore } from "../../stores/projectStore";
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
