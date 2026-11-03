import type { CollectionEntry } from 'astro:content';

export const POSTS_PER_PAGE = 6;

export type BlogPost = CollectionEntry<'blog'>;

/** Newest first, with a stable tie-breaker independent of collection load order. */
export function comparePostsByDate(a: BlogPost, b: BlogPost): number {
  return (
    b.data.pubDate.valueOf() - a.data.pubDate.valueOf() ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
}

export interface PostPage {
  posts: CollectionEntry<'blog'>[];
  currentPage: number;
  totalPages: number;
  totalPosts: number;
  href: string;
  previous?: string;
  next?: string;
}

export function postPageHref(page: number, baseUrl = '/'): string {
  if (!Number.isInteger(page) || page < 1) throw new RangeError('Invalid page number');
  const segments = baseUrl.split('/').filter(Boolean);
  const base = segments.length ? `/${segments.join('/')}/` : '/';
  return page === 1 ? base : `${base}page/${page}/`;
}

export function createPostPages(
  posts: readonly BlogPost[],
  baseUrl = '/',
  pageSize = POSTS_PER_PAGE
): PostPage[] {
  if (!Number.isInteger(pageSize) || pageSize < 1) throw new RangeError('Invalid page size');
  const sortedPosts = [...posts].sort(
    (a, b) =>
      Number(Boolean(b.data.pinned)) - Number(Boolean(a.data.pinned)) ||
      comparePostsByDate(a, b)
  );
  const totalPages = Math.max(1, Math.ceil(sortedPosts.length / pageSize));

  return Array.from({ length: totalPages }, (_, index) => {
    const currentPage = index + 1;
    return {
      posts: sortedPosts.slice(index * pageSize, (index + 1) * pageSize),
      currentPage,
      totalPages,
      totalPosts: sortedPosts.length,
      href: postPageHref(currentPage, baseUrl),
      previous: currentPage > 1 ? postPageHref(currentPage - 1, baseUrl) : undefined,
      next: currentPage < totalPages ? postPageHref(currentPage + 1, baseUrl) : undefined,
    };
  });
}
