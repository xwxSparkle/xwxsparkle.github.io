import type { APIRoute } from 'astro';
import { getPublishedPosts, getPostTranslation, plainText } from '../lib/server/content';
import type { SearchDocument } from '../lib/search';

export const prerender = true;

export const GET: APIRoute = async () => {
  const posts = await getPublishedPosts();
  const documents: SearchDocument[] = posts.map((post) => {
    const english = getPostTranslation(post);
    return {
      id: post.id,
      href: `${import.meta.env.BASE_URL}blog/${post.id}/`,
      title: post.data.title,
      description: post.data.description,
      category: post.data.category,
      tags: post.data.tags,
      pubDate: post.data.pubDate.toISOString(),
      content: plainText(post.body ?? ''),
      translations: english
        ? {
            en: {
              title: english.frontmatter.title,
              description: english.frontmatter.description,
              content: plainText(english.rawContent()),
            },
          }
        : undefined,
    };
  });
  return new Response(JSON.stringify(documents), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
