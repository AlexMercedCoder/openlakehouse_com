// Writes src/data/git-dates.json: first and last commit date for every file
// under src/, taken from full git history. The build reads git directly when
// history is complete and uses this snapshot only when the clone is shallow
// (see src/lib/git-dates.mjs). Run `npm run dates` and commit the result after
// content changes land.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, readGitHistory } from '../src/lib/git-dates.mjs';

const shallow = execFileSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: ROOT, encoding: 'utf8' }).trim();
if (shallow !== 'false') {
  console.error('git-dates: this clone is shallow, so dates would be wrong. Run `git fetch --unshallow` first.');
  process.exit(1);
}

const files = readGitHistory();
delete files['src/data/git-dates.json'];
const sorted = Object.fromEntries(Object.keys(files).sort().map((k) => [k, files[k]]));
const out = path.join(ROOT, 'src/data/git-dates.json');
writeFileSync(out, JSON.stringify({ generatedBy: 'scripts/build-git-dates.mjs', files: sorted }, null, 2) + '\n');
console.log(`git-dates: wrote ${Object.keys(sorted).length} entries to src/data/git-dates.json`);
