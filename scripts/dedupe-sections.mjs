/**
 * Removes duplicated `##` sections inside knowledge-base entries.
 *
 * Thirty entries carry the same multi-hundred-word section repeated up to four
 * times in a row, which looks like an authoring or generation slip rather than
 * intent: it is the identical heading and identical body, back to back. On the
 * worst files this accounts for about two thirds of the article.
 *
 * The first occurrence is kept. Later byte-identical repeats are dropped.
 * Sections that merely share a heading but differ in content are left alone.
 *
 * Run with --dry to preview.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KB = join(ROOT, 'src', 'content', 'kb');
const DRY = process.argv.includes('--dry');

const norm = (s) => s.replace(/\s+/g, ' ').trim();

let filesChanged = 0;
let sectionsRemoved = 0;
let wordsRemoved = 0;
const report = [];

for (const file of readdirSync(KB).filter((f) => f.endsWith('.md'))) {
  const path = join(KB, file);
  const text = readFileSync(path, 'utf-8');

  const fmMatch = text.match(/^---\n[\s\S]*?\n---\n?/);
  const frontmatter = fmMatch ? fmMatch[0] : '';
  const body = text.slice(frontmatter.length);

  // Split on level-2 headings, keeping any preamble before the first one.
  const parts = body.split(/\n(?=## )/);
  const seen = new Set();
  const kept = [];
  let removedHere = 0;
  let wordsHere = 0;

  for (const part of parts) {
    if (!/^## /.test(part)) { kept.push(part); continue; }
    const key = norm(part);
    if (seen.has(key)) {
      removedHere++;
      wordsHere += part.split(/\s+/).length;
      continue;
    }
    seen.add(key);
    kept.push(part);
  }

  if (!removedHere) continue;

  const rebuilt = frontmatter + kept.join('\n').replace(/\n{3,}/g, '\n\n');
  if (!DRY) writeFileSync(path, rebuilt, 'utf-8');

  filesChanged++;
  sectionsRemoved += removedHere;
  wordsRemoved += wordsHere;
  report.push({ file, removedHere, wordsHere, before: body.split(/\s+/).length });
}

console.log(
  `${DRY ? 'DRY RUN: ' : ''}${filesChanged} file(s), ` +
  `${sectionsRemoved} duplicate section(s) removed, ~${wordsRemoved.toLocaleString()} words`
);
report.sort((a, b) => b.wordsHere - a.wordsHere);
for (const r of report.slice(0, 10)) {
  const pct = Math.round((r.wordsHere / r.before) * 100);
  console.log(`  ${r.file.padEnd(42)} -${r.removedHere} section(s), -${String(r.wordsHere).padStart(5)} words (${pct}% of file)`);
}
