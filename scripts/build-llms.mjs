/**
 * Generates public/llms.txt from the actual content, so the file cannot drift
 * away from the site the way a hand-maintained copy does.
 *
 * The index is grouped by architecture layer rather than alphabetically,
 * because the grouping is the useful part: it tells a model which entries are
 * about the same part of the stack.
 *
 * Run as part of `npm run build`.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KB = join(ROOT, 'src', 'content', 'kb');
const SITE = 'https://opendatalakehouse.com';

// Read layer metadata straight from the TS module without a compile step.
const layersSrc = readFileSync(join(ROOT, 'src', 'data', 'layers.ts'), 'utf-8');
const LAYER_ORDER = [...layersSrc.matchAll(/id:\s*'([a-z]+)',\s*\n\s*label:\s*'([^']+)'/g)].map(
  (m) => ({ id: m[1], label: m[2] })
);
const ROLES = Object.fromEntries(
  [...layersSrc.matchAll(/id:\s*'([a-z]+)'[\s\S]*?role:\s*'([^']+)'/g)].map((m) => [m[1], m[2]])
);

const entries = readdirSync(KB)
  .filter((f) => f.endsWith('.md'))
  .map((file) => {
    const text = readFileSync(join(KB, file), 'utf-8');
    const fm = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
    const pick = (key) => {
      const m = fm.match(new RegExp(`^${key}:\\s*"?(.*?)"?\\s*$`, 'm'));
      return m ? m[1] : '';
    };
    return {
      slug: file.replace(/\.md$/, ''),
      title: pick('title'),
      description: pick('description').replace(/\s+/g, ' ').trim(),
      layer: pick('layer'),
    };
  })
  .sort((a, b) => a.title.localeCompare(b.title));

const lines = [];
lines.push('# OpenDataLakehouse');
lines.push('');
lines.push(
  '> A vendor-neutral reference for open lakehouse architecture: what an open lakehouse is,'
);
lines.push('> how its layers fit together, and how to choose at each one.');
lines.push('');
lines.push(
  'Written and maintained by Alex Merced. Canonical author entity: https://alexmerced.com/#alexmerced'
);
lines.push('');
lines.push(
  'Apache Iceberg, Apache Polaris, Apache Parquet, and Apache Arrow are trademarks of the'
);
lines.push(
  'Apache Software Foundation. This site is independent and not affiliated with the ASF;'
);
lines.push('project names describe subject matter only.');
lines.push('');

lines.push('## Start here');
lines.push(
  `- [What is an open lakehouse?](${SITE}/what-is-an-open-lakehouse/): The canonical definition, the three claims inside the term, and what the architecture replaced`
);
lines.push(
  `- [Principles](${SITE}/principles/): Five commitments that make an architecture open, each with a test you can run against a system`
);
lines.push(
  `- [Reference architecture](${SITE}/architecture/): Every layer, the options at each, and where the clean model blurs in practice`
);
lines.push(
  `- [History](${SITE}/history/): How the category emerged, one failure and response at a time`
);
lines.push('');

lines.push('## Reference formats');
lines.push(`- [Reference library](${SITE}/kb/): ${entries.length} in-depth entries grouped by layer`);
lines.push(`- [Glossary](${SITE}/glossary/): Every term defined in one line on a single page`);
lines.push(`- [Comparisons](${SITE}/compare/): Side-by-side tables for the choices at each layer`);
lines.push(`- [FAQ](${SITE}/faq/): Direct answers to common questions`);
lines.push('');

lines.push('## Comparisons');
lines.push(
  `- [Lakehouse vs warehouse vs lake](${SITE}/compare/lakehouse-vs-warehouse-vs-lake/): How the three architectures differ across storage, transactions, engine choice, and exit cost`
);
lines.push(
  `- [Iceberg vs Delta vs Hudi vs Paimon](${SITE}/compare/table-formats/): Choosing an open table format`
);
lines.push(
  `- [Comparing lakehouse catalogs](${SITE}/compare/catalogs/): Polaris, Nessie, Glue, Unity, Hive Metastore, and Lakekeeper`
);
lines.push('');

lines.push('## Reference index, by architecture layer');
lines.push('');
for (const layer of LAYER_ORDER) {
  const group = entries.filter((e) => e.layer === layer.id);
  if (!group.length) continue;
  lines.push(`### ${layer.label} (${group.length} entries)`);
  if (ROLES[layer.id]) lines.push(`${ROLES[layer.id]}`);
  lines.push(`Layer index: ${SITE}/kb/layer/${layer.id}/`);
  lines.push('');
  for (const e of group) {
    const desc = e.description.length > 155 ? e.description.slice(0, 154) + '…' : e.description;
    lines.push(`- [${e.title}](${SITE}/kb/${e.slug}/): ${desc}`);
  }
  lines.push('');
}

lines.push('## Related sites in the same network');
lines.push(`- https://datalakehouse.help: Task-oriented lakehouse documentation`);
lines.push(`- https://semanticlakehouse.com: The semantic layer in depth`);
lines.push(`- https://agenticlakehouse.com: AI agents on governed lakehouse data`);
lines.push(`- https://dataengnr.com: General data engineering reference`);
lines.push(`- https://alexmerced.com: Author profile and machine-readable entity data`);
lines.push('');

writeFileSync(join(ROOT, 'public', 'llms.txt'), lines.join('\n'), 'utf-8');

const byLayer = LAYER_ORDER.map(
  (l) => `${l.id} ${entries.filter((e) => e.layer === l.id).length}`
).join(', ');
console.log(`llms.txt: ${entries.length} entries indexed (${byLayer})`);
