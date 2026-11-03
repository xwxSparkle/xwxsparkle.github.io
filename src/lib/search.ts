import { categorySearchAliases, tagSearchAliases } from './taxonomy';

interface SearchTranslation {
  title: string;
  description: string;
  content: string;
}

export interface SearchDocument {
  id: string;
  href: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  pubDate: string;
  content: string;
  translations?: { en?: SearchTranslation };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isSearchTranslation(value: unknown): value is SearchTranslation {
  return (
    isRecord(value) &&
    typeof value.title === 'string' &&
    typeof value.description === 'string' &&
    typeof value.content === 'string'
  );
}

function isSearchDocument(value: unknown): value is SearchDocument {
  if (!isRecord(value)) return false;
  const requiredText = ['id', 'href', 'title', 'category', 'pubDate'] as const;
  if (!requiredText.every((field) => typeof value[field] === 'string' && value[field].trim()))
    return false;
  if (
    typeof value.description !== 'string' ||
    typeof value.content !== 'string' ||
    typeof value.pubDate !== 'string' ||
    !Number.isFinite(Date.parse(value.pubDate)) ||
    !Array.isArray(value.tags) ||
    !value.tags.every((tag) => typeof tag === 'string')
  )
    return false;
  if (value.translations === undefined) return true;
  return (
    isRecord(value.translations) &&
    (value.translations.en === undefined || isSearchTranslation(value.translations.en))
  );
}

/** Validate downloaded data before it becomes searchable text or a navigation target. */
export function parseSearchIndex(data: unknown, baseUrl: string): SearchDocument[] {
  if (!Array.isArray(data)) throw new Error('Invalid search index: expected an array');
  const base = new URL(baseUrl);
  return data.filter((post): post is SearchDocument => {
    if (!isSearchDocument(post)) return false;
    try {
      const target = new URL(post.href, base);
      return /^https?:$/.test(target.protocol) && target.origin === base.origin;
    } catch {
      // One malformed URL must not discard otherwise valid search results.
      return false;
    }
  });
}

export function localizeSearchPost(post: SearchDocument, language: 'en' | 'zh'): SearchDocument {
  const translation = language === 'en' ? post.translations?.en : undefined;
  return translation ? { ...post, ...translation } : post;
}

export const normalizeSearch = (value: string) =>
  value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/(^|\s)#(?=\S)/gu, '$1')
    .replace(/\s+/gu, ' ')
    .trim();

export function searchPosts(posts: SearchDocument[], query: string): SearchDocument[] {
  const terms = [...new Set(normalizeSearch(query).split(' ').filter(Boolean))];
  if (!terms.length) return [];

  return posts
    .flatMap((post) => {
      const variants = [post, ...(post.translations?.en ? [post.translations.en] : [])];
      const titles = variants.map((variant) => normalizeSearch(variant.title));
      const descriptions = variants.map((variant) => normalizeSearch(variant.description));
      const subjects = normalizeSearch(
        [...categorySearchAliases(post.category), ...post.tags.flatMap(tagSearchAliases)].join(' ')
      );
      const contents = variants.map((variant) => normalizeSearch(variant.content));
      const fields = [...titles, ...descriptions, subjects, ...contents];
      if (!terms.every((term) => fields.some((field) => field.includes(term)))) return [];
      const score = terms.reduce(
        (sum, term) =>
          sum +
          Math.max(
            ...titles.map((title) =>
              title === term ? 100 : title.startsWith(term) ? 30 : title.includes(term) ? 20 : 0
            )
          ) +
          (subjects.includes(term) ? 10 : 0) +
          (descriptions.some((description) => description.includes(term)) ? 6 : 0) +
          (contents.some((content) => content.includes(term)) ? 1 : 0),
        0
      );
      return [{ post, score }];
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        Date.parse(b.post.pubDate) - Date.parse(a.post.pubDate) ||
        a.post.title.localeCompare(b.post.title)
    )
    .map(({ post }) => post);
}

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/** Keep normalized search positions attached to the original, visible characters. */
function excerptText(content: string) {
  const segments = Array.from(graphemes.segment(content));
  const normalizedSegments = segments.map(({ segment }) => segment.normalize('NFKC'));
  // Lowercase the complete text so contextual forms, such as Greek sigma, stay correct.
  const text = normalizedSegments.join('').toLowerCase();
  const sourceSegments = normalizedSegments.flatMap((segment, index) =>
    Array.from({ length: segment.toLowerCase().length }, () => index)
  );
  const hashtags = new Set(
    Array.from(text.matchAll(/(^|\s)#(?=\S)/gu), (match) => match.index + match[1].length)
  );
  let normalized = '';
  const positions: number[] = [];
  for (let index = 0; index < text.length; index += 1) {
    if (hashtags.has(index)) continue;
    const character = text[index];
    if (/\s/u.test(character)) {
      if (!normalized || normalized.endsWith(' ')) continue;
      normalized += ' ';
    } else {
      normalized += character;
    }
    positions.push(sourceSegments[index]);
  }
  if (normalized.endsWith(' ')) {
    normalized = normalized.slice(0, -1);
    positions.pop();
  }
  return { normalized, positions, segments };
}

export function searchExcerpt(post: SearchDocument, query: string, limit = 160): string {
  const content = post.content || post.description;
  const { normalized, positions, segments } = excerptText(content);
  const matches = normalizeSearch(query)
    .split(' ')
    .filter(Boolean)
    .map((term) => normalized.indexOf(term))
    .filter((index) => index >= 0);
  const firstMatch = matches.length ? positions[Math.min(...matches)] : 0;
  const start = Math.max(0, firstMatch - 35);
  const end = start + Math.max(0, Math.floor(limit));
  const from = segments[start]?.index ?? content.length;
  const to = segments[end]?.index ?? content.length;
  const excerpt = content.slice(from, to).trim();
  return `${start ? '…' : ''}${excerpt}${end < segments.length ? '…' : ''}`;
}
