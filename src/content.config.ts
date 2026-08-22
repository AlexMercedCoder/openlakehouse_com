import { z, defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

const kbCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/kb" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    author: z.string().default('Alex Merced'),
    date: z.date(),
    diagrams_included: z.number().int().min(1, "Each KB entry must contain at least 1 diagram"),
    tags: z.array(z.string()).optional(),
    // Which architecture layer this entry belongs to. Assigned and validated by
    // scripts/assign-layers.mjs; the knowledge base groups by it.
    layer: z.enum([
      'foundation', 'storage', 'table', 'catalog', 'compute',
      'interchange', 'pipeline', 'semantic', 'ai',
    ]),
  }),
});

export const collections = {
  'kb': kbCollection,
};
