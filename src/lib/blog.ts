import { getCollection } from 'astro:content';

export const blogTitle = 'Haruki的博客';

const sectionTitles = {
  interests: '兴趣',
  explorations: '探索',
  thoughts: '随想',
  etc: '其他',
};

export function pageHref(slug = '') {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return slug ? `${base}/${slug}/` : `${base}/`;
}

async function loadSections() {
  const entries = await getCollection('blog');
  return Object.entries(sectionTitles).map(([slug, fallbackTitle]) => {
    const entry = entries.find((entry) => entry.id === slug);
    const title = entry?.data.title ?? fallbackTitle;
    const posts = entries
      .filter((post) => post.id.startsWith(`${slug}/`))
      .sort((a, b) => a.id.localeCompare(b.id));
    return { slug, title, entry, posts };
  });
}

export async function getSectionPaths() {
  const sections = await loadSections();
  return sections.map((section) => ({
    params: { section: section.slug },
    props: section,
  }));
}

export async function getPostPaths() {
  const sections = await loadSections();
  return sections.flatMap((section) => {
    const parent = { title: section.title, href: pageHref(section.slug) };
    return section.posts.map((post) => ({
      params: { section: section.slug, post: post.id.slice(section.slug.length + 1) },
      props: { post, parent },
    }));
  });
}
