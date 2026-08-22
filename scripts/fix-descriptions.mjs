/**
 * Rewrites knowledge-base descriptions so they define the term instead of
 * describing the article.
 *
 * Every description followed one of four formulas ("A comprehensive guide to X",
 * "A definitive technical deep-dive into X", and so on). Those say nothing a
 * reader or an answer engine can use, and they carry the clichés.
 *
 * The replacement is drawn from the entry's own opening sentence, which is
 * already a definition in this corpus. Nothing is invented: if an entry has no
 * usable opening sentence it is left alone and reported.
 *
 * Run with --dry to preview.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KB = join(ROOT, 'src', 'content', 'kb');
const DRY = process.argv.includes('--dry');
const MAX = 158;

const FORMULAIC =
  /^(a|an)\s+(comprehensive|definitive|authoritative|detailed|in-depth|complete|thorough)?\s*(technical\s+)?(guide|deep[- ]dive|overview|analysis|introduction|look|exploration)\b/i;

const skipped = [];
const samples = [];
let changed = 0;

function firstSentences(body) {
  // Drop the leading H1 and any heading lines, then take the first real paragraph.
  const para = body
    .replace(/^#.*$/gm, '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .find((p) => p && !p.startsWith('>') && !p.startsWith('```') && !p.startsWith('|') && !p.startsWith('*') && !p.startsWith('-'));
  if (!para) return null;

  const clean = para
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  // Build up whole sentences until adding another would exceed the cap.
  const parts = clean.split(/(?<=\.)\s+/);
  let out = '';
  for (const s of parts) {
    if (!out) { out = s; if (out.length >= 90) break; continue; }
    if ((out + ' ' + s).length > MAX) break;
    out += ' ' + s;
  }
  if (out.length > MAX) {
    const cut = out.slice(0, MAX);
    out = cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:]$/, '') + '.';
  }
  return out.length >= 60 ? out : null;
}

for (const file of readdirSync(KB).filter((f) => f.endsWith('.md'))) {
  const path = join(KB, file);
  const text = readFileSync(path, 'utf-8');
  const fm = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!fm) continue;

  const current = fm[1].match(/^description:\s*"([\s\S]*?)"\s*$/m);
  if (!current) continue;

  // Only touch the formulaic ones; anything already specific stays.
  if (!FORMULAIC.test(current[1].trim())) continue;

  const body = text.slice(fm[0].length);
  const next = firstSentences(body);
  if (!next) { skipped.push(file); continue; }

  const escaped = next.replace(/"/g, '\\"');
  const updated = text.replace(
    /^description:\s*"[\s\S]*?"\s*$/m,
    `description: "${escaped}"`
  );
  if (updated === text) { skipped.push(file); continue; }

  if (samples.length < 8) {
    samples.push({ file, before: current[1].slice(0, 118), after: next.slice(0, 118) });
  }
  if (!DRY) writeFileSync(path, updated, 'utf-8');
  changed++;
}

console.log(`${DRY ? 'DRY RUN: ' : ''}${changed} description(s) rewritten from the entry's own opening`);
if (skipped.length) console.log(`  left alone (no usable opening): ${skipped.length} -> ${skipped.slice(0, 6).join(', ')}`);
for (const s of samples) {
  console.log(`\n  ${s.file}`);
  console.log(`   - ${s.before}`);
  console.log(`   + ${s.after}`);
}
