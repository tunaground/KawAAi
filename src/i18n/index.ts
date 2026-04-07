import { create } from "zustand";
import { ko } from "./ko";
import { ja } from "./ja";
import { en } from "./en";

type TranslationKey = keyof typeof ko;
type Locale = "ko" | "ja" | "en";

const translations: Record<Locale, Record<string, string>> = { ko, ja, en };

function detectLocale(): Locale {
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith("ko")) return "ko";
  if (lang.startsWith("ja")) return "ja";
  return "en";
}

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
}

export const useI18n = create<I18nState>((set, get) => ({
  locale: detectLocale(),

  setLocale: (locale) => set({ locale }),

  t: (key) => {
    const dict = translations[get().locale];
    return dict[key] ?? key;
  },
}));

/** 컴포넌트 밖에서 사용할 수 있는 번역 함수 */
export function t(key: TranslationKey): string {
  return useI18n.getState().t(key);
}
