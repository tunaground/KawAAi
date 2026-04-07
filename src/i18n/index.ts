import { useConfigStore, type TranslationKey } from "../stores/configStore";
import type { AppConfig } from "../types/config";

type Locale = "ko" | "ja" | "en";

interface I18nAPI {
  locale: Locale;
  setLocale: (l: AppConfig["locale"]) => void;
  t: (key: TranslationKey) => string;
}

/**
 * 컴포넌트용 i18n hook.
 * useI18n((s) => s.t), useI18n((s) => s.locale) 패턴 유지.
 */
export function useI18n<T>(selector: (state: I18nAPI) => T): T {
  return useConfigStore((s) => selector({
    locale: s.resolvedLocale,
    setLocale: s.setLocale,
    t: s.t,
  }));
}

/** 컴포넌트 밖에서 사용할 수 있는 번역 함수 */
export function t(key: TranslationKey): string {
  return useConfigStore.getState().t(key);
}
