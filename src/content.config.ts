import { z, defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

const kbCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/kb" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    author: z.string().default('Alex Merced'),
    date: z.date(),
    diagrams_included: z.number().int().min(2, "Each KB entry must contain exactly 2 diagrams"),
    tags: z.array(z.string()).optional(),
  }),
});

export const collections = {
  'kb': kbCollection,
};
