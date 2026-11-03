import type { Language } from './i18n';

const postDateFormatters: Record<Language, Intl.DateTimeFormat> = {
  en: new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }),
  zh: new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }),
};

/** Keep publication dates on the same UTC calendar day during SSR and language changes. */
export function formatPostDate(date: Date, language: Language = 'en'): string {
  return postDateFormatters[language].format(date);
}
