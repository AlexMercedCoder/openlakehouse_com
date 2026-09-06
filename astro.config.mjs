// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import stripLeadingH1 from './src/plugins/strip-leading-h1.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://opendatalakehouse.com',
  integrations: [
    sitemap({
      serialize(item) {
        item.lastmod = new Date();
        return item;
      }
    })
  ],
  markdown: {
    remarkPlugins: [stripLeadingH1]
  }
});
