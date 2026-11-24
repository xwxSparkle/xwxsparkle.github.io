import type { CollectionEntry } from 'astro:content';
import { htmlToHast, type HastNode } from 'satteri';

function plainText(node: HastNode): string {
  if (node.type === 'text') return node.value;
  if (node.type !== 'element') return '';
  if (node.tagName === 'br') return ' ';
  if (node.tagName === 'img') return String(node.properties.alt ?? '');
  if (node.tagName === 'script' || node.tagName === 'style') return '';
  return node.children.map(plainText).join('');
}

export function getPostPreview(post: CollectionEntry<'blog'>): string {
  const root = htmlToHast(post.rendered?.html ?? '', { fragment: true });
  if (root.type !== 'root') return '';

  let firstBlock = '';
  for (const block of root.children) {
    const text = plainText(block).replace(/\s+/g, ' ').trim();
    if (!text) continue;
    if (block.type === 'element' && block.tagName === 'p') return text;
    firstBlock ||= text;
  }
  return firstBlock;
}
