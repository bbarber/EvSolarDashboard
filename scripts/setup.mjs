#!/usr/bin/env node
// One-shot local dev bootstrap:
//   1. verify Docker is running (the Supabase CLI is the `supabase` devDep, run via npx)
//   2. ensure .env.local exists
//   3. start the local Supabase stack (Docker)
//   4. write the local API URL + publishable key into .env.local
//   5. apply migrations + seed (db reset)
//   6. install Playwright browsers (for `pnpm run test:e2e`)
// Re-runnable: safe to run again; it refreshes the local credentials.

import { execSync, spawnSync } from 'node:child_process';
import { existsSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';

const ENV_FILE = '.env.local';
const URL_KEY = 'NEXT_PUBLIC_SUPABASE_URL';
const PUBLISHABLE_KEY = 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY';

function log(msg) {
  console.log(`\n> ${msg}`);
}
function fail(msg) {
  console.error(`\nERROR: ${msg}`);
  process.exit(1);
}

// Run a command, inheriting stdio so the user sees CLI progress.
function run(cmd, args) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: false });
  if (res.status !== 0) {
    fail(`Command failed: ${cmd} ${args.join(' ')}`);
  }
}

// Run a command and capture stdout.
function capture(cmd, args) {
  const res = spawnSync(cmd, args, { encoding: 'utf8', shell: false });
  if (res.status !== 0) {
    fail(`Command failed: ${cmd} ${args.join(' ')}\n${res.stderr ?? ''}`);
  }
  return res.stdout;
}

// 1. Prerequisites
log('Checking Docker is running...');
try {
  execSync('docker info', { stdio: 'ignore' });
} catch {
  fail(
    'Docker is not running. Start Docker Desktop (or your runtime) and retry.',
  );
}

// 2. .env.local
if (!existsSync(ENV_FILE)) {
  if (!existsSync('.env.example')) fail('.env.example is missing.');
  copyFileSync('.env.example', ENV_FILE);
  log(`Created ${ENV_FILE} from .env.example`);
}

// 3. Start the local stack (idempotent -- no-op if already running)
log('Starting local Supabase stack (first run downloads Docker images)...');
log(
  "  (transient 'error from registry: Rate exceeded' lines are normal on first pull --\n" +
    '   the CLI retries automatically; safe to ignore as long as the stack comes up.)',
);
run('npx', ['supabase', 'start']);

// 4. Capture local credentials and write them into .env.local
log('Writing local credentials into .env.local...');
const statusEnv = capture('npx', [
  'supabase',
  'status',
  '-o',
  'env',
  '--override-name',
  `api.url=${URL_KEY}`,
  '--override-name',
  `auth.publishable_key=${PUBLISHABLE_KEY}`,
]);

const creds = {};
for (const line of statusEnv.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)="?([^"]*)"?$/);
  if (m) creds[m[1]] = m[2];
}
if (!creds[URL_KEY] || !creds[PUBLISHABLE_KEY]) {
  fail('Could not parse local credentials from `supabase status`.');
}

// Replace existing NEXT_PUBLIC_SUPABASE_* lines, keep everything else.
const existing = readFileSync(ENV_FILE, 'utf8')
  .split('\n')
  .filter(
    (l) => !l.startsWith(`${URL_KEY}=`) && !l.startsWith(`${PUBLISHABLE_KEY}=`),
  )
  .join('\n')
  .replace(/\n+$/, '');
const next =
  `${existing}\n${URL_KEY}=${creds[URL_KEY]}\n${PUBLISHABLE_KEY}=${creds[PUBLISHABLE_KEY]}\n`.replace(
    /^\n+/,
    '',
  );
writeFileSync(ENV_FILE, next);

// 5. Apply migrations + seed
log('Applying migrations and seed (supabase db reset)...');
run('npx', ['supabase', 'db', 'reset']);

// 6. Install Playwright browsers (needed for `pnpm run test:e2e`).
//    Idempotent: skips browsers already cached in ~/Library/Caches/ms-playwright.
//    CI sets SKIP_PLAYWRIGHT_INSTALL=1 so each workflow controls exactly which
//    browsers it installs (and can cache them) instead of always pulling both.
if (process.env.SKIP_PLAYWRIGHT_INSTALL) {
  log('Skipping Playwright browser install (SKIP_PLAYWRIGHT_INSTALL set).');
} else {
  log('Installing Playwright browsers (Chromium + WebKit)...');
  run('npx', ['playwright', 'install', 'chromium', 'webkit']);
}

console.log(`
Local environment ready.

  - Supabase Studio:  http://127.0.0.1:54323
  - API URL:          ${creds[URL_KEY]}
  - Credentials written to ${ENV_FILE}

Next:
  - pnpm run dev            start the app at http://localhost:3000
  - pnpm run db:new <name>  create a migration (or use the supabase-migration Claude skill)
  - pnpm run db:stop        stop the local stack

Using a hosted Supabase project instead? See "Bring your own Supabase" in the README,
or documentation/setting-up-with-claude.md for the full setup runbook.
`);
