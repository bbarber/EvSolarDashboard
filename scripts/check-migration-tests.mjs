#!/usr/bin/env node
// Deterministic backstop: if a change adds/edits a migration but touches no
// integration test, flag it. This is intentionally COARSE — it cannot tell
// whether a given migration *needs* a test (that judgment is the AI code-review
// layer's job; see the supabase-migration skill). It just makes "migration with
// no test" impossible to merge silently.
//
// Usage:
//   node scripts/check-migration-tests.mjs [<base-ref>] [--strict]
//     <base-ref>  what to diff against (default: origin/main). CI passes the PR base sha.
//     --strict    exit 1 (fail the build) instead of just warning.
//
// Emits a GitHub Actions ::warning:: annotation when run in CI so it surfaces on the PR.

import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const base =
  args.find((a) => !a.startsWith('--')) ||
  process.env.BASE_REF ||
  'origin/main';

function git(cmdArgs) {
  const res = spawnSync('git', cmdArgs, { encoding: 'utf8', shell: false });
  if (res.status !== 0) {
    // A git failure (missing base ref, shallow checkout) means we couldn't run the
    // check at all. In lenient mode that's a non-event; in --strict mode, swallowing
    // it would be a false negative (silent pass), which defeats the gate — so fail.
    console.error(`git ${cmdArgs.join(' ')} failed:\n${res.stderr ?? ''}`);
    if (strict) {
      console.error(
        'Could not determine the diff in --strict mode (missing base ref or shallow ' +
          'checkout?). Failing rather than passing silently.',
      );
    }
    process.exit(strict ? 1 : 0);
  }
  return res.stdout;
}

// Files added (A), modified (M), or renamed (R) since the merge-base with `base`.
const diff = git([
  'diff',
  '--name-status',
  '--diff-filter=AMR',
  `${base}...HEAD`,
]);
const changed = diff
  .split('\n')
  .filter(Boolean)
  .map((line) => line.split('\t').pop().trim());

const migrations = changed.filter(
  (f) => f.startsWith('supabase/migrations/') && f.endsWith('.sql'),
);
const integrationTests = changed.filter((f) =>
  f.endsWith('.integration.test.ts'),
);

if (migrations.length === 0) {
  console.log('No migration changes in this diff — nothing to check.');
  process.exit(0);
}

if (integrationTests.length > 0) {
  console.log(
    `Migration change(s) accompanied by integration test change(s):\n` +
      `  migrations: ${migrations.join(', ')}\n` +
      `  tests:      ${integrationTests.join(', ')}`,
  );
  process.exit(0);
}

const msg =
  `This change modifies ${migrations.length} migration file(s) but no *.integration.test.ts:\n` +
  migrations.map((m) => `  - ${m}`).join('\n') +
  `\n\nIf the migration adds testable DB behavior (RLS policies, triggers, functions, ` +
  `constraints, defaults), add an integration test (pnpm run test:integration). ` +
  `If it's purely structural and needs no test, this warning is safe to ignore.`;

if (process.env.GITHUB_ACTIONS === 'true') {
  console.log(
    `::warning title=Migration without integration test::${msg.replace(/\n/g, '%0A')}`,
  );
} else {
  console.warn(`\n⚠️  ${msg}\n`);
}

process.exit(strict ? 1 : 0);
