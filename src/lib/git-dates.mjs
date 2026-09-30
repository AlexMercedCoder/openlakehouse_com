// Per-file dates from git history (files under src/ and public/), used for JSON-LD dateModified/datePublished
// and sitemap <lastmod>.
//
// Netlify may build from a shallow clone, where every file would appear to be
// last touched by the single fetched commit. So: with full history, read git
// directly at build time; with shallow history (or no git at all), fall back to
// src/data/git-dates.json, a snapshot committed by `npm run dates`
// (scripts/build-git-dates.mjs). Within one build the source never mixes.
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

// The project root. Not derived from import.meta.url: Astro bundles this module
// into its build output, so the file's own location is not stable. Builds and
// the snapshot script both run from the project root.
export const ROOT = process.cwd();
const SNAPSHOT = path.join(ROOT, 'src/data/git-dates.json');

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

/** Walk `git log` once and collect first and last commit dates per path. */
export function readGitHistory() {
  const out = git(['log', '--format=@%cI', '--name-only', '--no-renames', '--', 'src', 'public']);
  const files = {};
  let date = null;
  for (const line of out.split('\n')) {
    if (line.startsWith('@')) { date = line.slice(1); continue; }
    if (!line || !date) continue;
    // git log is newest first: the first sighting is the last modification,
    // the final sighting is the first commit.
    const f = (files[line] ??= { modified: date, created: date });
    f.created = date;
  }
  return files;
}

function loadDates() {
  try {
    if (git(['rev-parse', '--is-shallow-repository']) === 'false') {
      return { source: 'git', files: readGitHistory() };
    }
  } catch {
    // no git binary or not a repository: use the snapshot
  }
  if (existsSync(SNAPSHOT)) {
    return { source: 'snapshot', files: JSON.parse(readFileSync(SNAPSHOT, 'utf8')).files };
  }
  return { source: 'none', files: {} };
}

let cache;
function dates() {
  return (cache ??= loadDates());
}

export function dateSource() {
  return dates().source;
}

/** Dates for a repo-relative path such as "src/content/terms/abac.md". */
export function fileDates(relPath) {
  return dates().files[relPath.replace(/\\/g, '/')] ?? null;
}

/** Latest modification across several repo-relative paths (or a prefix). */
export function latestModified(paths) {
  const all = dates().files;
  let best = null;
  for (const p of paths) {
    const keys = p.endsWith('/') ? Object.keys(all).filter((k) => k.startsWith(p)) : [p];
    for (const k of keys) {
      const m = all[k]?.modified;
      if (m && (!best || new Date(m) > new Date(best))) best = m;
    }
  }
  return best;
}
