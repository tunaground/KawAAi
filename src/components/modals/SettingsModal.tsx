import { useI18n } from "../../i18n";
import { useConfigStore } from "../../stores/configStore";
import type { AutoSaveInterval } from "../../types/config";
import styles from "./SettingsModal.module.css";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const AUTO_SAVE_OPTIONS: { value: AutoSaveInterval; label: string }[] = [
  { value: 0, label: "안함" },
  { value: 30, label: "30초" },
  { value: 60, label: "1분" },
  { value: 180, label: "3분" },
  { value: 300, label: "5분" },
  { value: 600, label: "10분" },
];

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const t = useI18n((s) => s.t);
  const locale = useI18n((s) => s.locale);
  const setI18nLocale = useI18n((s) => s.setLocale);
  const config = useConfigStore((s) => s.config);
  const setTheme = useConfigStore((s) => s.setTheme);
  const setConfigLocale = useConfigStore((s) => s.setLocale);
  const setAutoSaveInterval = useConfigStore((s) => s.setAutoSaveInterval);

  if (!open) return null;

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.title}>{t("settings.title")}</div>

        <div className={styles.row}>
          <label className={styles.label}>{t("settings.language")}</label>
          <select
            className={styles.select}
            value={locale}
            onChange={(e) => {
              const v = e.target.value as "ko" | "ja" | "en";
              setI18nLocale(v);
              setConfigLocale(v);
            }}
          >
            <option value="ko">한국어</option>
            <option value="ja">日本語</option>
            <option value="en">English</option>
          </select>
        </div>

        <div className={styles.row}>
          <label className={styles.label}>{t("settings.theme")}</label>
          <select
            className={styles.select}
            value={config.theme}
            onChange={(e) =>
              setTheme(e.target.value as "system" | "light" | "dark")
            }
          >
            <option value="system">{t("settings.themeSystem")}</option>
            <option value="light">{t("settings.themeLight")}</option>
            <option value="dark">{t("settings.themeDark")}</option>
          </select>
        </div>

        <div className={styles.row}>
          <label className={styles.label}>자동 저장</label>
          <select
            className={styles.select}
            value={config.autoSaveInterval}
            onChange={(e) =>
              setAutoSaveInterval(Number(e.target.value) as AutoSaveInterval)
            }
          >
            {AUTO_SAVE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.footer}>
          <button className={styles.closeBtn} onClick={onClose}>
            {t("modal.ok")}
          </button>
        </div>
      </div>
    </div>
  );
}
