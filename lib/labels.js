/**
 * Bilingual labels.
 *
 * Several screens name things in both languages — "Dealer (ডিলার)" — which
 * helps staff who read Bangla and clutters the screen for those who do
 * not. App language in System Settings decides which they see; the words
 * themselves live next to what they describe, not in a translation file,
 * because there are only a handful of them.
 */

export const LANGUAGES = {
  "bn-en": "English + বাংলা — Dealer (ডিলার)",
  en: "English only — Dealer",
};

export const DEFAULT_LANGUAGE = "bn-en";

/** "Dealer (ডিলার)" or plain "Dealer", depending on the setting */
export const bilingual = (en, bn, language = DEFAULT_LANGUAGE) =>
  language === "en" || !bn ? en : `${en} (${bn})`;
