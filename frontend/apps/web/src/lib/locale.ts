export const supportedLocales = [
  { id: 'en', label: 'English', direction: 'ltr' },
  { id: 'fr', label: 'Français', direction: 'ltr' },
  { id: 'pt', label: 'Português', direction: 'ltr' },
  { id: 'ar', label: 'العربية', direction: 'rtl' },
] as const;

export type SupportedLocale = (typeof supportedLocales)[number]['id'];

export function currentLocale(): SupportedLocale {
  const saved = localStorage.getItem('aiw-locale');
  return supportedLocales.some((item) => item.id === saved) ? saved as SupportedLocale : 'en';
}

export function applyLocale(locale: SupportedLocale): void {
  const definition = supportedLocales.find((item) => item.id === locale) ?? supportedLocales[0];
  localStorage.setItem('aiw-locale', definition.id);
  document.documentElement.lang = definition.id;
  document.documentElement.dir = definition.direction;
}

export function formatLocalDate(value: string | Date, locale = currentLocale()): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
}

export function formatLocalNumber(value: number, locale = currentLocale()): string {
  return new Intl.NumberFormat(locale).format(value);
}
