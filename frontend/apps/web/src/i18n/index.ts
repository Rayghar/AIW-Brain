// i18n (global-audience track). Strategy: t('key','English fallback') everywhere
// a string faces the user; catalogs per locale; dir flips for RTL locales.
// This release converts the newly-authored surfaces; extraction of legacy
// components proceeds per the gap register.
export type Locale = 'en' | 'fr' | 'ar';
const RTL: Locale[] = ['ar'];
const catalogs: Record<Locale, Record<string, string>> = { en: {}, fr: {}, ar: {} };
let active: Locale = 'en';
export function setLocale(locale: Locale): void {
  active = locale;
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
    document.documentElement.dir = RTL.includes(locale) ? 'rtl' : 'ltr';
  }
}
export function t(key: string, fallback: string): string { return catalogs[active][key] ?? fallback; }
export function registerCatalog(locale: Locale, entries: Record<string, string>): void {
  catalogs[locale] = { ...catalogs[locale], ...entries };
}
