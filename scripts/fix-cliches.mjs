/**
 * Removes AI-writing clichés from the site's prose.
 *
 * Replacements are phrase-level and grammar-aware rather than word swaps, so
 * "seamlessly integrates with" becomes "integrates directly with" instead of
 * leaving a dangling adverb. Code fences and inline code are untouched.
 *
 * A few of these phrases appear inside boilerplate that is repeated across
 * dozens of entries, so one rule here can fix eighty copies.
 *
 * Run with --dry to preview.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');

/** [pattern, replacement]. Order matters: longer phrases first. */
const RULES = [
  // The repeated conclusion paragraph, rewritten once for all 80 copies.
  [
    /The concepts explored in this article are not isolated techniques; they are interconnected components of a holistic data strategy\. Whether you are designing a logical Star Schema, configuring the physical block size of a Parquet file, or writing the Python DAG to orchestrate the workflow, the ultimate goal remains identical: delivering high-quality, reliable, and performant data to the business to drive analytical insight and operational efficiency\./g,
    'These concepts are not isolated techniques. Designing a Star Schema, setting the block size of a Parquet file, and writing the DAG that orchestrates the workflow all serve one goal: delivering reliable, performant data the business can act on.',
  ],

  // Headings and phrases built on "deep dive".
  [/Extended Deep Dive: Modern Data Engineering Paradigms/g, 'How This Fits the Wider Platform'],
  [/\bExtended Deep Dive\b/g, 'In More Depth'],
  [/\bA Deep Dive into\b/g, 'Understanding'],
  [/\bDeep Dive into\b/g, 'Understanding'],
  [/\bdeep[- ]dive into\b/gi, 'close look at'],
  [/\bDeep Dive\b/g, 'In Depth'],
  [/\bdeep[- ]dive\b/gi, 'detailed look'],
  [/\blet's dive into\b/gi, "let's look at"],
  [/\bdiving into\b/gi, 'working through'],
  [/\bdives into\b/gi, 'works through'],
  [/\bdive into\b/gi, 'work through'],

  // "Seamless" as filler.
  [/\bseamlessly integrat(e|es|ed|ing)\b/gi, 'integrat$1 directly'],
  [/\bseamless integration\b/gi, 'direct integration'],
  [/\bseamlessly connect(s|ed|ing)?\b/gi, 'connect$1 directly'],
  [/\bseamlessly handles\b/gi, 'handles'],
  [/\bseamlessly\b/gi, 'without extra work'],
  [/\bseamless\b/gi, 'direct'],

  // Marketing superlatives.
  // Only the article-blurb phrasings. "definitive agreement" is a legal term,
  // and "the definitive pioneer" means something a synonym would not preserve.
  [/\bthe definitive guide to\b/gi, 'a working guide to'],
  [/\bA definitive technical deep[- ]dive\b/g, 'A technical account'],
  [/\bA definitive technical\b/g, 'A technical'],
  // Plural form too: \b after "shift" does not match "shifts".
  [/\bparadigm shifts\b/gi, 'shifts in approach'],
  [/\bparadigm shift\b/gi, 'shift in approach'],
  [/\brevolutioniz(e|es|ed|ing)\b/gi, 'reshap$1'],
  [/\bgame[- ]chang(er|ing)\b/gi, 'significant'],
  [/\bcutting[- ]edge\b/gi, 'current'],

  // "Unlock", "empower", "elevate" as verbs for ordinary capability.
  [/\bunlocks several\b/gi, 'makes possible several'],
  [/\bunlocks the\b/gi, 'makes possible the'],
  [/\bunlocks two\b/gi, 'brings two'],
  [/\bunlock(s|ing|ed)?\b/gi, (m) => (m.endsWith('s') ? 'enables' : m.endsWith('ing') ? 'enabling' : m.endsWith('ed') ? 'enabled' : 'enable')],
  [/\bempower(s|ing|ed)?\b/gi, (m) => (m.endsWith('s') ? 'lets' : m.endsWith('ing') ? 'letting' : m.endsWith('ed') ? 'let' : 'let')],
  [/\belevat(e|es|ing)\b/gi, (m) => (m.endsWith('es') ? 'raises' : m.endsWith('ing') ? 'raising' : 'raise')],

  // Figurative filler nouns.
  [/\bthe (data|modern|technology|analytics|AI) landscape\b/gi, 'the $1 field'],
  [/\bin the realm of\b/gi, 'in'],
  [/\brealm\b/gi, 'area'],
  [/\bis a testament to\b/gi, 'shows'],
  [/\bever[- ]evolving\b/gi, 'changing'],

  // A second repeated boilerplate opening, and the remaining figurative uses.
  [
    /To fully appreciate this concept, it is essential to understand the modern data engineering landscape, the challenges it solves, and the advanced architectural patterns/g,
    'To place this concept properly, it helps to understand how modern data engineering works, the problems it solves, and the architectural patterns',
  ],
  [/\bIn the modern data architecture landscape,\s*/g, 'In modern data architectures, '],
  [/\bmaps the available data landscape\b/gi, 'maps the available data'],
  [/\bin the lakehouse catalog landscape\b/gi, 'for lakehouse catalogs'],
  [/\bthe lakehouse governance landscape\b/gi, 'lakehouse governance'],
  [/\ba testament to\b/gi, 'which reflects'],
  [/\b(\w+) landscape\b/gi, '$1 field'],
];

const counts = new Map();
const samples = [];

function apply(text) {
  let s = text;
  for (const [pat, rep] of RULES) {
    // Count separately, then hand the replacement straight to String.replace.
    // Routing a string replacement through a callback would turn "$1" into a
    // literal instead of a backreference.
    const hits = s.match(pat);
    if (!hits) continue;
    counts.set(pat.source.slice(0, 46), (counts.get(pat.source.slice(0, 46)) ?? 0) + hits.length);
    s = typeof rep === 'function' ? s.replace(pat, (m) => rep(m)) : s.replace(pat, rep);
  }
  return s;
}

function protectedSplit(line) {
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

function fixFile(path) {
  const original = readFileSync(path, 'utf-8');
  const lines = original.split('\n');
  let inFence = false;
  const out = lines.map((line) => {
    if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; return line; }
    if (inFence) return line;
    const fixed = protectedSplit(line).map((s) => (s.safe ? apply(s.text) : s.text)).join('');
    if (fixed !== line && samples.length < 14) {
      samples.push({ file: relative(ROOT, path), before: line.trim().slice(0, 116), after: fixed.trim().slice(0, 116) });
    }
    return fixed;
  }).join('\n');

  if (out === original) return false;
  if (!DRY) writeFileSync(path, out, 'utf-8');
  return true;
}

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (['node_modules', '.git', 'dist', '.astro'].includes(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (/\.(md|astro|ts)$/.test(name)) acc.push(p);
  }
  return acc;
}

let changed = 0;
for (const f of walk(join(ROOT, 'src'))) if (fixFile(f)) changed++;

const total = [...counts.values()].reduce((a, b) => a + b, 0);
console.log(`${DRY ? 'DRY RUN: ' : ''}${changed} file(s), ${total} replacement(s)`);
for (const [k, v] of [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
  console.log(`  ${String(v).padStart(4)}  /${k}/`);
}
for (const s of samples) {
  console.log(`\n  ${s.file}`);
  console.log(`   - ${s.before}`);
  console.log(`   + ${s.after}`);
}
