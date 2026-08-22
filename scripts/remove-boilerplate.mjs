/**
 * Removes generic sections that were appended to many entries without being
 * about those entries.
 *
 * Two sections account for every remaining cross-entry duplication in the
 * knowledge base: a potted history of data warehousing and a general essay on
 * pipeline practice. Neither mentions the term of the entry it sits on, so on a
 * compression-codec page it is filler, and across twenty pages it is duplicate
 * content competing with itself in search.
 *
 * Matching is by heading, and only for headings on the known list, so an entry
 * that genuinely covers this ground under its own heading is untouched.
 *
 * Run with --dry to preview, including the resulting size of every entry.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KB = join(ROOT, 'src', 'content', 'kb');
const DRY = process.argv.includes('--dry');

/** Headings whose bodies are generic rather than about the entry's subject. */
const GENERIC_HEADINGS = [
  /^## How This Fits the Wider Platform\b/,
  /^## In More Depth: The Data Engineering Ecosystem\b/,
  /^## In More Depth\b/,
  /^## Extended Deep Dive\b/,
];

let filesChanged = 0;
let wordsRemoved = 0;
const results = [];

for (const file of readdirSync(KB).filter((f) => f.endsWith('.md'))) {
  const path = join(KB, file);
  const text = readFileSync(path, 'utf-8');

  const fm = text.match(/^---\n[\s\S]*?\n---\n?/);
  const front = fm ? fm[0] : '';
  const body = text.slice(front.length);
  const before = body.split(/\s+/).length;

  const parts = body.split(/\n(?=## )/);
  const kept = [];
  let removed = 0;

  for (const part of parts) {
    if (GENERIC_HEADINGS.some((h) => h.test(part.trimStart()))) {
      removed += part.split(/\s+/).length;
      continue;
    }
    kept.push(part);
  }

  if (!removed) continue;

  const rebuilt = (front + kept.join('\n').replace(/\n{3,}/g, '\n\n')).trimEnd() + '\n';
  const after = rebuilt.slice(front.length).split(/\s+/).length;

  if (!DRY) writeFileSync(path, rebuilt, 'utf-8');
  filesChanged++;
  wordsRemoved += removed;
  results.push({ file, before, after, removed });
}

console.log(
  `${DRY ? 'DRY RUN: ' : ''}${filesChanged} file(s), ${wordsRemoved.toLocaleString()} words of generic filler removed`
);

results.sort((a, b) => a.after - b.after);
const thin = results.filter((r) => r.after < 700);
console.log(`\nsmallest entries after removal:`);
for (const r of results.slice(0, 8)) {
  console.log(`  ${r.file.padEnd(38)} ${String(r.before).padStart(5)} -> ${String(r.after).padStart(5)} words`);
}
if (thin.length) {
  console.log(`\n${thin.length} entr(y/ies) now under 700 words and may want expanding:`);
  for (const r of thin) console.log(`  ${r.file} (${r.after})`);
} else {
  console.log('\nno entry falls below 700 words.');
}
