import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { normalizeCategory, normalizeTags } from './lib/taxonomy';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/blog' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      heroImage: image().optional(),
      category: z.string().trim().min(1).default('随笔').transform(normalizeCategory),
      tags: z.array(z.string()).default([]).transform(normalizeTags),
      pinned: z.boolean().default(false),
    }),
});

export const collections = { blog };
