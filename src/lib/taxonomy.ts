import type { CollectionEntry } from 'astro:content';
import { comparePostsByDate } from './posts';

export const BUILT_IN_CATEGORIES = [
  { name: '随笔', english: 'Essays', translationKey: 'category.essays' },
  { name: '日志', english: 'Journal', translationKey: 'category.journal' },
  { name: '笔记', english: 'Notes', translationKey: 'category.notes' },
  { name: '评测', english: 'Reviews', translationKey: 'category.reviews' },
] as const;

export type CategoryTranslationKey = (typeof BUILT_IN_CATEGORIES)[number]['translationKey'];

const TAG_TRANSLATIONS = [
  { name: '大学', english: 'University', translationKey: 'tag.university' },
  { name: '成长', english: 'Growth', translationKey: 'tag.growth' },
  { name: '自我', english: 'Self', translationKey: 'tag.self' },
  { name: '思考', english: 'Reflections', translationKey: 'tag.reflections' },
  { name: '人际关系', english: 'Relationships', translationKey: 'tag.relationships' },
  { name: '内心', english: 'Inner World', translationKey: 'tag.innerWorld' },
] as const;

export function normalizeTags(tags: readonly string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim().normalize('NFC')).filter(Boolean))];
}

export function taxonomyRouteName(name: string): string {
  // Keep literal percent sequences distinct when Astro repeatedly decodes paths.
  return name.trim().normalize('NFC').replace(/~/g, '~7E').replace(/%/g, '~25');
}

function categoryDefinition(category: string) {
  const name = category.trim().normalize('NFC');
  return BUILT_IN_CATEGORIES.find(
    (entry) => entry.name === name || entry.english.toLowerCase() === name.toLowerCase()
  );
}

export function normalizeCategory(category: string): string {
  return categoryDefinition(category)?.name ?? (category.trim().normalize('NFC') || '随笔');
}

export function categoryLabel(category: string, language: 'en' | 'zh' = 'en'): string {
  const name = normalizeCategory(category);
  const entry = categoryDefinition(name);
  return language === 'en' && entry ? entry.english : name;
}

export function categoryTranslationKey(category: string): CategoryTranslationKey | undefined {
  return categoryDefinition(normalizeCategory(category))?.translationKey;
}

export function categorySearchAliases(category: string): string[] {
  const name = normalizeCategory(category);
  return [name, categoryLabel(name, 'en')];
}

function tagDefinition(tag: string) {
  const name = tag.trim().normalize('NFC');
  return TAG_TRANSLATIONS.find((entry) => entry.name === name);
}

export function tagLabel(tag: string, language: 'en' | 'zh' = 'en'): string {
  const name = tag.trim().normalize('NFC');
  const entry = tagDefinition(name);
  return language === 'en' && entry ? entry.english : name;
}

export function tagSearchAliases(tag: string): string[] {
  const name = tag.trim().normalize('NFC');
  return [...new Set([name, tagLabel(name, 'en')])];
}

export interface TaxonomyGroup {
  name: string;
  posts: CollectionEntry<'blog'>[];
}

export type CategoryGroup = TaxonomyGroup;
export type TagGroup = TaxonomyGroup;

export function groupPostsByCategory(posts: readonly CollectionEntry<'blog'>[]): CategoryGroup[] {
  const groups = new Map<string, CollectionEntry<'blog'>[]>(
    BUILT_IN_CATEGORIES.map(({ name }) => [name, []])
  );

  for (const post of posts) {
    const name = normalizeCategory(post.data.category);
    const entries = groups.get(name) ?? [];
    entries.push(post);
    groups.set(name, entries);
  }

  const names = [
    ...BUILT_IN_CATEGORIES.map(({ name }) => name),
    ...Array.from(groups.keys())
      .filter((name) => !BUILT_IN_CATEGORIES.some((entry) => entry.name === name))
      .sort((a, b) => a.localeCompare(b, 'zh-CN')),
  ];
  return names.map((name) => ({
    name,
    posts: groups.get(name)!.sort(comparePostsByDate),
  }));
}

export function categoryHref(category: string, baseUrl = '/'): string {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${base}categories/${encodeURIComponent(taxonomyRouteName(normalizeCategory(category)))}/`;
}

export function categoryRouteParam(category: string): string {
  // Astro decodes pathnames with decodeURI, which keeps reserved characters escaped.
  return decodeURI(encodeURIComponent(taxonomyRouteName(normalizeCategory(category))));
}

export function groupPostsByTag(posts: readonly CollectionEntry<'blog'>[]): TagGroup[] {
  const groups = new Map<string, CollectionEntry<'blog'>[]>();

  for (const post of posts) {
    const tags = normalizeTags(post.data.tags);

    for (const name of tags) {
      const entries = groups.get(name) ?? [];
      entries.push(post);
      groups.set(name, entries);
    }
  }

  return Array.from(groups, ([name, entries]) => ({
    name,
    posts: entries.sort(comparePostsByDate),
  })).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
}

export function tagHref(tag: string, baseUrl = '/'): string {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${base}tags/${encodeURIComponent(taxonomyRouteName(tag))}/`;
}

export function tagRouteParam(tag: string): string {
  // Astro decodes pathnames with decodeURI, which keeps reserved characters escaped.
  return decodeURI(encodeURIComponent(taxonomyRouteName(tag)));
}
