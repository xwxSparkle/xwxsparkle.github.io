import type { MarkdownInstance } from 'astro';
import { getCollection } from 'astro:content';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { comparePostsByDate, type BlogPost } from '../posts';

interface TranslatedPost {
  title: string;
  description: string;
}

const modules = import.meta.glob<MarkdownInstance<TranslatedPost>>(
  '../../translations/en/blog/**/*.md',
  { eager: true }
);
const translations = new Map(
  Object.entries(modules).map(([path, translation]) => [
    path.slice('../../translations/en/blog/'.length, -3),
    translation,
  ])
);
const blogDirectory = resolve('src/blog');

/** Server-only entry point for public blog data. */
export async function getPublishedPosts(): Promise<BlogPost[]> {
  return (await getCollection('blog')).sort(comparePostsByDate);
}

export function getPostTranslation(post: { id: string; filePath?: string }) {
  if (!post.filePath) return translations.get(post.id);

  // Source filenames remain stable when Astro derives a slug or a post declares its own.
  const sourcePath = relative(blogDirectory, resolve(post.filePath));
  if (sourcePath === '..' || sourcePath.startsWith(`..${sep}`) || isAbsolute(sourcePath)) {
    return undefined;
  }
  const key = sourcePath.split(sep).join('/').replace(/\.md$/, '');
  return translations.get(key);
}

export function plainText(markdown: string): string {
  return markdown
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

/** Send only the opening text to previews; CSS determines the two visible lines. */
export function getPostExcerpts(post: BlogPost) {
  const opening = (markdown: string) => Array.from(plainText(markdown)).slice(0, 320).join('');
  const original = opening(post.body ?? '');
  const translated = getPostTranslation(post)?.rawContent();
  return { zh: original, en: translated === undefined ? original : opening(translated) };
}
