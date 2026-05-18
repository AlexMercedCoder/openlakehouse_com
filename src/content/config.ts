import { z, defineCollection } from 'astro:content';

const kbCollection = defineCollection({
  type: 'content',
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
