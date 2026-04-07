import { useI18n } from "../../i18n";
import { useConfigStore } from "../../stores/configStore";
import type { AutoSaveInterval } from "../../types/config";
import styles from "./SettingsModal.module.css";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const AUTO_SAVE_OPTIONS: { value: AutoSaveInterval; labelKey: string }[] = [
  { value: 0, labelKey: "settings.autoSaveOff" },
  { value: 30, labelKey: "settings.autoSave30s" },
  { value: 60, labelKey: "settings.autoSave1m" },
  { value: 180, labelKey: "settings.autoSave3m" },
  { value: 300, labelKey: "settings.autoSave5m" },
  { value: 600, labelKey: "settings.autoSave10m" },
];

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const t = useI18n((s) => s.t);
  const locale = useI18n((s) => s.locale);
  const config = useConfigStore((s) => s.config);
  const setTheme = useConfigStore((s) => s.setTheme);
  const setLocale = useConfigStore((s) => s.setLocale);
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
              setLocale(v);
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
          <label className={styles.label}>{t("settings.autoSave")}</label>
          <select
            className={styles.select}
            value={config.autoSaveInterval}
            onChange={(e) =>
              setAutoSaveInterval(Number(e.target.value) as AutoSaveInterval)
            }
          >
            {AUTO_SAVE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.labelKey as any)}
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
