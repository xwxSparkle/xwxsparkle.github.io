import {
  isTranslationKey,
  translate as translateMessage,
  type Language,
  type LocalizedText,
  type TranslationKey,
  type TranslationParams,
} from '../lib/i18n';
import { formatPostDate } from '../lib/dates';

export type { Language, LocalizedText, TranslationKey, TranslationParams } from '../lib/i18n';

// Shared document events are the contract between otherwise independent controllers.
declare global {
  interface DocumentEventMap {
    'site:language-change': CustomEvent<{ language: Language }>;
    'site:sidebar-close': Event;
  }
}

export function currentLanguage(): Language {
  if (typeof document === 'undefined') return 'en';
  const root = document.documentElement;
  if (root.dataset.language === 'en' || root.dataset.language === 'zh')
    return root.dataset.language;
  return root.lang.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export function translate(
  key: TranslationKey,
  language: Language = currentLanguage(),
  params: TranslationParams = {}
): string {
  return translateMessage(key, language, params);
}

function translationParams(element: Element): TranslationParams {
  try {
    const parsed: unknown = JSON.parse(element.getAttribute('data-i18n-params') ?? '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed).filter(
          ([, value]) => typeof value === 'string' || typeof value === 'number'
        )
      );
    }
  } catch {
    // Invalid optional parameters must not prevent the rest of the page from translating.
  }
  return {};
}

function localizedText(
  element: Element,
  attribute: string,
  language: Language
): string | undefined {
  try {
    const values: unknown = JSON.parse(element.getAttribute(attribute) ?? '{}');
    if (values && typeof values === 'object') {
      const text = (values as Partial<LocalizedText>)[language];
      if (typeof text === 'string') return text;
    }
  } catch {
    // Invalid optional translations leave the original content readable.
  }
  return undefined;
}

export function applyLanguage(language: Language = currentLanguage(), scope?: ParentNode): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const changed = currentLanguage() !== language;
  const target = changed ? document : (scope ?? document);
  root.dataset.language = language;
  root.lang = language === 'zh' ? 'zh-CN' : 'en';

  const elements = (selector: string) => [
    ...(target instanceof Element && target.matches(selector) ? [target] : []),
    ...target.querySelectorAll(selector),
  ];

  elements('[data-i18n]').forEach((element) => {
    const key = element.getAttribute('data-i18n');
    if (isTranslationKey(key) && element.childElementCount === 0) {
      element.textContent = translate(key, language, translationParams(element));
    }
  });

  for (const attribute of ['aria-label', 'title', 'placeholder', 'alt', 'content']) {
    elements(`[data-i18n-${attribute}]`).forEach((element) => {
      const key = element.getAttribute(`data-i18n-${attribute}`);
      if (isTranslationKey(key)) {
        element.setAttribute(attribute, translate(key, language, translationParams(element)));
      }
    });
  }

  elements('time[data-i18n-date][datetime]').forEach((element) => {
    const date = new Date(element.getAttribute('datetime') ?? '');
    if (Number.isNaN(date.getTime())) return;
    element.textContent = formatPostDate(date, language);
  });

  elements('[data-i18n-page-title]').forEach((element) => {
    const key = element.getAttribute('data-i18n-page-title');
    if (!isTranslationKey(key)) return;
    const title = translate(key, language, translationParams(element));
    const siteTitle = element.getAttribute('data-i18n-site-title') ?? '';
    const pageTitle = siteTitle && title !== siteTitle ? `${title} | ${siteTitle}` : title;
    if (element.tagName === 'META') element.setAttribute('content', pageTitle);
    else element.textContent = pageTitle;
  });

  elements('[data-localized]').forEach((element) => {
    const text = localizedText(element, 'data-localized', language);
    if (text !== undefined && element.childElementCount === 0) element.textContent = text;
  });
  elements('[data-localized-content]').forEach((element) => {
    const text = localizedText(element, 'data-localized-content', language);
    if (text !== undefined) element.setAttribute('content', text);
  });

  document.querySelectorAll<HTMLButtonElement>('[data-language-option]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.languageOption === language));
  });

  if (changed) {
    document.dispatchEvent(new CustomEvent('site:language-change', { detail: { language } }));
  }
}
