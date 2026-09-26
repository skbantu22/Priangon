/**
 * App language.
 *
 * Three ways to read the same screen:
 *   en     "Dealer"
 *   bn     "ডিলার"
 *   bn-en  "Dealer (ডিলার)"
 *
 * The words live next to what they name rather than in a translation
 * file, because there are a few dozen of them and a separate file would
 * drift out of step with the screens.
 */

export const LANGUAGES = {
  en: { label: "English", sample: "Dealer" },
  bn: { label: "বাংলা", sample: "ডিলার" },
  "bn-en": { label: "English + বাংলা", sample: "Dealer (ডিলার)" },
};

export const DEFAULT_LANGUAGE = "bn-en";

export const isLanguage = (value) => Object.hasOwn(LANGUAGES, value);

/**
 * Picks the wording for the current language. Falls back to English
 * whenever a Bangla word is missing, so a half-translated screen still
 * reads rather than showing a blank.
 */
export const bilingual = (en, bn, language = DEFAULT_LANGUAGE) => {
  if (!bn) return en;
  if (language === "en") return en;
  if (language === "bn") return bn;

  return `${en} (${bn})`;
};

/** Bangla alone where the pair would be too long, e.g. a sidebar row */
export const oneLine = (en, bn, language = DEFAULT_LANGUAGE) => {
  if (!bn || language === "en") return en;
  if (language === "bn") return bn;

  return `${en} · ${bn}`;
};
