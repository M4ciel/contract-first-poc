// Usage (from the workspace root): node tools/src/changeset-check.ts [base-sha]   (or BASE_SHA=<sha>)
// Fails when the change affects a published package without a changeset for it.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { checkChangesets } from './changeset-check-core.ts';

const git = (...args: string[]) =>
  execFileSync('git', args, { encoding: 'utf8' }).split('\n').filter(Boolean);

const base =
  process.argv[2] ??
  process.env['BASE_SHA'] ??
  git('merge-base', 'HEAD', 'origin/main')[0] ??
  git('merge-base', 'HEAD', 'main')[0];
if (!base || /^0+$/.test(base)) {
  console.log('⏭  No base commit: changeset check skipped.');
  process.exit(0);
}

// Committed changes since the base plus the working tree, so it also works before committing.
const changed = [
  ...new Set([
    ...git('diff', '--name-only', base),
    ...git('ls-files', '--others', '--exclude-standard'),
  ]),
];
const added = changed.filter(
  (file) =>
    file.startsWith('.changeset/') && file.endsWith('.md') && file !== '.changeset/README.md',
);
const { affected, covered, missing } = checkChangesets(
  changed,
  added.map((file) => {
    try {
      return readFileSync(file, 'utf8');
    } catch {
      return ''; // deleted by the change (for example consumed by `changeset version`)
    }
  }),
);

console.log(`Affected packages: ${affected.join(', ') || 'none'}`);
console.log(`Covered by changesets: ${covered.join(', ') || 'none'}`);
if (missing.length > 0) {
  console.error(`✖ Missing a changeset for: ${missing.join(', ')}. Run \`pnpm changeset\`.`);
  process.exit(1);
}
console.log('✔ Every affected package has a changeset.');
