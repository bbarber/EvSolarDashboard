#!/usr/bin/env node
// Run the integration test suite against the LOCAL Supabase stack (Docker).
//
//   1. verify Docker is running
//   2. read local credentials from `supabase status` (URL + publishable + service-role)
//   3. GUARD: refuse to proceed unless the API URL is localhost (127.0.0.1)
//   4. exec vitest with the integration config and those credentials
//
// This never links to or touches a hosted project. The service-role key it exports
// only ever exists for the local Docker stack; the localhost guard makes it
// impossible to accidentally aim these (destructive) tests at anything else.
//
// Extra args pass through to vitest, e.g.:
//   pnpm run test:integration -- lib/accessors/user-accessor.integration.test.ts

import { execSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const URL_KEY = 'NEXT_PUBLIC_SUPABASE_URL';
const DB_URL_KEY = 'SUPABASE_DB_URL';
const PUBLISHABLE_KEY = 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY';
const SERVICE_ROLE_KEY = 'SUPABASE_SERVICE_ROLE_KEY';

function fail(msg) {
  console.error(`\nERROR: ${msg}`);
  process.exit(1);
}

// 1. Docker
try {
  execSync('docker info', { stdio: 'ignore' });
} catch {
  fail(
    'Docker is not running. Start Docker Desktop (or your runtime) and retry.',
  );
}

// 2. Local credentials from `supabase status`.
//    Use `--override-name` so the CLI emits the exact keys we want (matching
//    scripts/setup.mjs' approach) rather than coupling to whatever default names
//    the CLI happens to emit. Fall back to the legacy default names if an older
//    CLI ignores an override, so the runner degrades gracefully instead of failing
//    when the values are actually present.
const status = spawnSync(
  'npx',
  [
    'supabase',
    'status',
    '-o',
    'env',
    '--override-name',
    `api.url=${URL_KEY}`,
    '--override-name',
    `auth.publishable_key=${PUBLISHABLE_KEY}`,
    '--override-name',
    `auth.service_role_key=${SERVICE_ROLE_KEY}`,
    '--override-name',
    `db.url=${DB_URL_KEY}`,
  ],
  { encoding: 'utf8', shell: false },
);
if (status.status !== 0) {
  fail(
    'Could not read `supabase status`. Is the local stack running?\n' +
      '  Run `pnpm run db:start` (or `pnpm run setup`) first.\n' +
      (status.stderr ?? ''),
  );
}

const raw = {};
for (const line of status.stdout.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)="?([^"]*)"?$/);
  if (m) raw[m[1]] = m[2];
}

const url = raw[URL_KEY] ?? raw.API_URL;
const publishable = raw[PUBLISHABLE_KEY] ?? raw.PUBLISHABLE_KEY;
const serviceRole = raw[SERVICE_ROLE_KEY] ?? raw.SERVICE_ROLE_KEY;
// Direct DB connection for server-side accessors (e.g. word-accessor). Same
// local-only guarantee: it comes from the same local `supabase status`.
const dbUrl = raw[DB_URL_KEY] ?? raw.DB_URL;
if (!url || !publishable || !serviceRole) {
  fail(
    `Could not parse local credentials from \`supabase status\` ` +
      `(need ${URL_KEY}, ${PUBLISHABLE_KEY}, ${SERVICE_ROLE_KEY}).`,
  );
}

// 3. GUARD: local only. The service-role key bypasses RLS — never let these tests
//    point anywhere but the local Docker stack.
let host;
try {
  host = new URL(url).hostname;
} catch {
  fail(`Unparseable Supabase URL from status: ${url}`);
}
if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
  fail(
    `Refusing to run integration tests against non-local Supabase: ${url}\n` +
      'These tests are destructive and local-Docker-only.',
  );
}

// 4. Serve Edge Functions for the duration of the run (if the repo has any).
//    `supabase start` does NOT serve functions — `supabase functions serve` is a
//    separate process — and the black-box tests in supabase/functions-tests/
//    call them over HTTP. Underscore-prefixed folders (_shared) are not functions.
const functionsDir = path.join('supabase', 'functions');
const functionNames = existsSync(functionsDir)
  ? readdirSync(functionsDir, { withFileTypes: true })
      .filter(
        (d) =>
          d.isDirectory() &&
          !d.name.startsWith('_') &&
          !d.name.startsWith('.') &&
          existsSync(path.join(functionsDir, d.name, 'index.ts')),
      )
      .map((d) => d.name)
  : [];

let serveProcess = null;
if (functionNames.length > 0) {
  console.log(`Serving edge functions: ${functionNames.join(', ')} …`);
  // Output is piped (not inherited) so hot-reload chatter doesn't interleave
  // with vitest output; it's replayed only if readiness fails.
  serveProcess = spawn('npx', ['supabase', 'functions', 'serve'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  });
  let serveOutput = '';
  serveProcess.stdout.on('data', (d) => (serveOutput += d));
  serveProcess.stderr.on('data', (d) => (serveOutput += d));

  // Readiness: poll one function's URL until the gateway stops erroring.
  // Any HTTP response < 500 (e.g. the 401 from JWT verification) means the
  // functions runtime is up; 5xx/refused means it isn't yet.
  const probe = `${url}/functions/v1/${functionNames[0]}`;
  const deadline = Date.now() + 60_000;
  let ready = false;
  while (Date.now() < deadline) {
    try {
      const resp = await fetch(probe, { method: 'OPTIONS' });
      if (resp.status < 500) {
        ready = true;
        break;
      }
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!ready) {
    serveProcess.kill('SIGTERM');
    fail(
      'Edge functions runtime did not become ready within 60s.\n' + serveOutput,
    );
  }
}

// 5. Hand off to vitest with real local creds in the env.
const res = spawnSync(
  'npx',
  [
    'vitest',
    'run',
    '--config',
    'vitest.integration.config.ts',
    ...process.argv.slice(2),
  ],
  {
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      [URL_KEY]: url,
      [PUBLISHABLE_KEY]: publishable,
      [SERVICE_ROLE_KEY]: serviceRole,
      [DB_URL_KEY]: dbUrl,
    },
  },
);

// 6. Tear the serve process down before reporting the result.
if (serveProcess) serveProcess.kill('SIGTERM');
process.exit(res.status ?? 1);
