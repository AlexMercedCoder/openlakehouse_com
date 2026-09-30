import fs from 'node:fs';
// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import stripLeadingH1 from './src/plugins/strip-leading-h1.mjs';
import { latestModified } from './src/lib/git-dates.mjs';

// Source files behind each non-KB URL, for git-derived <lastmod>. A trailing
// slash means "anything under this folder". KB entries map to their own file.
const KB = 'src/content/kb/';
const PAGE_SOURCES = {
  '/': ['src/pages/index.astro', 'src/data/layers.ts', 'src/data/comparisons.ts'],
  '/architecture/': ['src/pages/architecture.astro', 'src/data/layers.ts', 'src/components/LayerStack.astro', 'public/diagrams/'],
  '/blogs/': ['src/pages/blogs/index.astro', 'src/data/blogs.json'],
  '/books/': ['src/pages/books/index.astro', 'src/data/books.json'],
  '/videos/': ['src/pages/videos/index.astro', 'src/data/videos.json'],
  '/compare/': ['src/pages/compare/index.astro', 'src/data/comparisons.ts'],
  '/compare/compatibility/': ['src/pages/compare/compatibility.astro', 'src/data/compatibility.json'],
  '/example/': ['src/pages/example.astro'],
  '/faq/': ['src/pages/faq.astro'],
  '/glossary/': ['src/pages/glossary.astro', KB],
  '/history/': ['src/pages/history.astro'],
  '/kb/': ['src/pages/kb/index.astro', KB],
  '/principles/': ['src/pages/principles.astro'],
  '/what-is-an-open-lakehouse/': ['src/pages/what-is-an-open-lakehouse.astro', 'src/data/layers.ts'],
};

function sourcesFor(pathname) {
  const path = pathname.endsWith('/') ? pathname : `${pathname}/`;
  if (PAGE_SOURCES[path]) return PAGE_SOURCES[path];
  if (path.startsWith('/compare/')) return ['src/pages/compare/[slug].astro', 'src/data/comparisons.ts'];
  if (path.startsWith('/kb/layer/')) return ['src/pages/kb/layer/[layer].astro', 'src/data/layers.ts', KB];
  const kbId = path.match(/^\/kb\/([^/]+)\/$/)?.[1];
  if (kbId) return [`${KB}${kbId}.md`];
  return null;
}

// https://astro.build/config
const crossCanonical = new Set(
  fs.readdirSync('./src/content/kb')
    .filter((f) => f.endsWith('.md') && /^canonical:/m.test(fs.readFileSync(`./src/content/kb/${f}`, 'utf8').split('\n---')[0]))
    .map((f) => `/kb/${f.replace(/\.md$/, '')}/`)
);

export default defineConfig({
  site: 'https://opendatalakehouse.com',
  integrations: [
    sitemap({
      // Terms cross-canonicalized to another network glossary stay out of the sitemap.
      filter: (page) => !crossCanonical.has(new URL(page).pathname),
      // lastmod is the last commit that touched the page's sources, read from
      // git (or the committed snapshot on a shallow clone). Pages with no known
      // source get no lastmod rather than a made-up one.
      serialize(item) {
        const sources = sourcesFor(new URL(item.url).pathname);
        const lastmod = sources && latestModified(sources);
        if (lastmod) item.lastmod = new Date(lastmod).toISOString();
        return item;
      }
    })
  ],
  markdown: {
    remarkPlugins: [stripLeadingH1]
  }
});
