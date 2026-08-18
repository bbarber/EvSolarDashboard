#!/usr/bin/env node
// One-time project initialization: turn this template into YOUR project.
//   1. rewrite the app-name placeholders (package.json `name`, lib/site.ts)
//   2. move the template's own README to TEMPLATE.md (delete it once you're settled)
//   3. write a project README skeleton (status badges + environments table)
//
// Run ONCE, right after creating a repo from the template. Guarded: it refuses to run
// again once package.json has been renamed off the template default.
//
// Usage:
//   pnpm run init                  # interactive prompt
//   pnpm run init -- "My App"      # non-interactive (agent / CI flow)
//   pnpm run init -- "My App" "One-line description"

import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const TEMPLATE_NAME = 'nextjs-supabase-template';
const SKELETON = 'scripts/templates/README.project.md';

function fail(msg) {
  console.error(`\nERROR: ${msg}`);
  process.exit(1);
}
function log(msg) {
  console.log(`  ✓ ${msg}`);
}

// 1. Guard: only run on an un-initialized template.
const pkgRaw = readFileSync('package.json', 'utf8');
const pkg = JSON.parse(pkgRaw);
if (pkg.name !== TEMPLATE_NAME) {
  console.log(
    `\nThis project already looks initialized (package.json name is "${pkg.name}",\n` +
      `not the template default "${TEMPLATE_NAME}"). Nothing to do.\n\n` +
      `To force a re-run, reset the package.json name to "${TEMPLATE_NAME}" first.`,
  );
  process.exit(0);
}

// 2. Collect the app name (CLI arg wins; otherwise prompt when interactive).
let appName = (process.argv[2] ?? '').trim();
let description = (process.argv[3] ?? '').trim();

if (!appName) {
  if (!stdin.isTTY) {
    fail(
      'No app name given and not running interactively.\n' +
        'Pass one: `pnpm run init -- "My App"`.',
    );
  }
  const rl = createInterface({ input: stdin, output: stdout });
  appName = (await rl.question('App name: ')).trim();
  if (!description) {
    description = (
      await rl.question('One-line description (optional): ')
    ).trim();
  }
  rl.close();
}
if (!appName) fail('App name is required.');
if (!description) description = `${appName} — a Next.js + Supabase app`;

// npm package names must be lowercase, url-safe.
const slug =
  appName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'app';

// 3. Best-effort owner/repo from the git remote (for the README badges).
let owner = '<owner>';
let repo = '<repo>';
try {
  const url = execSync('git remote get-url origin', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
  const m = url.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/);
  if (m) {
    owner = m[1];
    repo = m[2];
  }
} catch {
  // no remote yet — leave <owner>/<repo> placeholders in the badges
}

console.log(`\nInitializing project as "${appName}"...\n`);

// 4. package.json name
writeFileSync(
  'package.json',
  pkgRaw.replace(`"name": "${TEMPLATE_NAME}"`, `"name": "${slug}"`),
);
log(`package.json name -> "${slug}"`);

// 5. supabase/config.toml project_id — names the local Docker stack (containers,
//    volumes, and the group shown in Docker Desktop), so match it to the app.
let config = readFileSync('supabase/config.toml', 'utf8');
config = config.replace(/^project_id = "[^"]*"/m, `project_id = "${slug}"`);
writeFileSync('supabase/config.toml', config);
log(`supabase/config.toml project_id -> "${slug}"`);

// 6. lib/site.ts (SITE_NAME / SITE_DESCRIPTION)
const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
let site = readFileSync('lib/site.ts', 'utf8');
site = site
  .replace(
    /export const SITE_NAME = '[^']*';/,
    `export const SITE_NAME = '${esc(appName)}';`,
  )
  .replace(
    /export const SITE_DESCRIPTION = '[^']*';/,
    `export const SITE_DESCRIPTION = '${esc(description)}';`,
  );
writeFileSync('lib/site.ts', site);
log(`lib/site.ts SITE_NAME -> "${appName}"`);

// 7. README swap: template README -> TEMPLATE.md, project skeleton -> README.md
if (!existsSync(SKELETON)) fail(`Missing skeleton: ${SKELETON}`);
const skeleton = readFileSync(SKELETON, 'utf8')
  .replaceAll('{{APP_NAME}}', appName)
  .replaceAll('{{APP_DESCRIPTION}}', description)
  .replaceAll('{{OWNER}}', owner)
  .replaceAll('{{REPO}}', repo);

if (existsSync('README.md') && !existsSync('TEMPLATE.md')) {
  renameSync('README.md', 'TEMPLATE.md');
  log('template README.md -> TEMPLATE.md');
}
writeFileSync('README.md', skeleton);
log('wrote project README.md');

const badgeNote =
  owner === '<owner>'
    ? '  - Set <owner>/<repo> in the README badges (no git remote found yet).\n'
    : '';

console.log(`
Done. "${appName}" is initialized.

Next:
${badgeNote}  - Fill in the Environments table in README.md once your URLs exist.
  - pnpm run setup     bootstrap local Supabase + .env.local
  - pnpm run dev       start the app at http://localhost:3000

Template notes now live in TEMPLATE.md and CUSTOMIZATIONS.md — delete them whenever you like.
`);
