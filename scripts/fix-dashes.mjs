/**
 * Replaces em dashes with conventional punctuation across the site's prose.
 *
 * A blind swap to commas produces comma splices and comma soup, so this reads
 * the surrounding context and picks:
 *
 *   paired dashes, inner text has commas   ->  parentheses
 *   paired dashes, inner text is clean     ->  commas
 *   single dash before a subordinate clause->  comma
 *   single dash before an explanation/list ->  colon
 *
 * Code fences, inline code, link targets and YAML keys are left alone, since a
 * dash inside them is content rather than punctuation.
 *
 * Run with --dry to preview counts and a sample without writing.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');

/** Words that begin a subordinate or contrasting clause: a comma reads better. */
const CLAUSE_STARTERS = new Set([
  'if', 'which', 'when', 'while', 'because', 'since', 'but', 'and', 'or', 'so',
  'though', 'although', 'unless', 'until', 'whereas', 'far', 'rather', 'not',
  'even', 'often', 'usually', 'typically', 'sometimes', 'always', 'never',
  'each', 'every', 'both', 'either', 'neither', 'with', 'without', 'for',
  'from', 'to', 'in', 'on', 'at', 'by', 'as', 'than', 'then', 'yet', 'still',
  'making', 'meaning', 'giving', 'leaving', 'allowing', 'ensuring', 'creating',
]);

const stats = { paired: 0, parens: 0, commas: 0, colons: 0, clauseCommas: 0, labelCommas: 0 };
const samples = [];

/** Split a line into segments, marking which are protected from edits. */
function segments(line) {
  const out = [];
  // Protect code spans, markdown link targets, bare URLs and quoted paths:
  // a replacement inside any of these changes a destination, not prose.
  const re = /(`[^`]*`|\[[^\]]*\]\([^)]*\)|https?:\/\/[^\s"'`)<>]+|"\/[^"]*"|'\/[^']*')/g;
  let last = 0, m;
  while ((m = re.exec(line))) {
    if (m.index > last) out.push({ text: line.slice(last, m.index), safe: true });
    out.push({ text: m[0], safe: false });
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push({ text: line.slice(last), safe: true });
  return out;
}

function fixText(text) {
  let s = text;

  // 1. Paired dashes wrapping a parenthetical, spaced or unspaced.
  s = s.replace(/\s*—\s*([^—]{2,150}?)\s*—\s*/g, (whole, inner) => {
    stats.paired++;
    if (/,/.test(inner)) {
      stats.parens++;
      return ` (${inner.trim()}) `;
    }
    stats.commas++;
    return `, ${inner.trim()}, `;
  });

  // 2. Remaining single dashes.
  s = s.replace(/\s*—\s*/g, (whole, offset, full) => {
    const after = full.slice(offset + whole.length);
    const firstWord = (after.match(/^\*{0,2}([A-Za-z']+)/) || [, ''])[1].toLowerCase();
    if (CLAUSE_STARTERS.has(firstWord)) {
      stats.clauseCommas++;
      return ', ';
    }
    // "Phase 1 — Physical Write:" would become a sentence with two colons.
    // A comma keeps the label readable.
    if (/^\*{0,2}[^.:;]{1,44}\*{0,2}:/.test(after)) {
      stats.labelCommas++;
      return ', ';
    }
    stats.colons++;
    return ': ';
  });

  // Tidy artefacts: space before punctuation, doubled separators.
  s = s.replace(/\s+([,.;:)])/g, '$1');
  s = s.replace(/\(\s+/g, '(');
  s = s.replace(/,\s*,/g, ',');
  s = s.replace(/:\s*:/g, ':');
  s = s.replace(/([,:;])\s*\)/g, ')');
  return s;
}

function fixFile(path) {
  const original = readFileSync(path, 'utf-8');
  if (!original.includes('—')) return false;

  const lines = original.split('\n');
  let inFence = false;
  const out = lines.map((line) => {
    if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; return line; }
    if (inFence) return line;
    if (!line.includes('—')) return line;
    // Leave YAML frontmatter keys and indented code alone.
    if (/^\s{4,}\S/.test(line) && !/^\s*[-*]\s/.test(line)) return line;

    const fixed = segments(line)
      .map((seg) => (seg.safe ? fixText(seg.text) : seg.text))
      .join('');

    if (fixed !== line && samples.length < 16) {
      const at = line.indexOf('\u2014');
      const from = Math.max(0, at - 62);
      samples.push({
        file: relative(ROOT, path),
        before: line.slice(from, at + 78).trim(),
        after: fixed.slice(Math.max(0, from - 2), at + 78).trim(),
      });
    }
    return fixed;
  }).join('\n');

  if (out === original) return false;
  if (!DRY) writeFileSync(path, out, 'utf-8');
  return true;
}

function walk(dir, exts, acc = []) {
  for (const name of readdirSync(dir)) {
    if (['node_modules', '.git', 'dist', '.astro'].includes(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, exts, acc);
    else if (exts.some((e) => name.endsWith(e))) acc.push(p);
  }
  return acc;
}

const targets = [
  ...walk(join(ROOT, 'src'), ['.md', '.astro', '.ts']),
];

let changed = 0;
for (const f of targets) if (fixFile(f)) changed++;

console.log(`${DRY ? 'DRY RUN: ' : ''}${changed} file(s) ${DRY ? 'would change' : 'changed'}`);
console.log(
  `  paired ${stats.paired} (-> ${stats.parens} parentheses, ${stats.commas} comma pairs), ` +
  `single -> ${stats.colons} colons, ${stats.clauseCommas + stats.labelCommas} commas`
);
console.log('\nsamples:');
for (const s of samples) {
  console.log(`\n  ${s.file}`);
  console.log(`   - ${s.before}`);
  console.log(`   + ${s.after}`);
}
