/**
 * `hello-user` — the template's example Edge Function: JWT-verified
 * (config.toml), body validated against the shared DTO, DB client bound to
 * the caller's Authorization header so every query runs under their RLS.
 * Conventions: CLAUDE.md → Edge Functions (and the supabase-edge-function
 * skill). Black-box tests: supabase/functions-tests/.
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../_shared/database.types.ts';
import {
  helloUserRequestSchema,
  type HelloUserResponse,
} from '../_shared/hello-user-dto.ts';
import { buildGreeting } from '../_shared/greeting.ts';
import { corsPreflightResponse, jsonResponse } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsPreflightResponse();
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  // Validate the body against the shared DTO. `functions.invoke` sends no
  // body at all when the caller omits it — treat that as an empty object.
  const text = await req.text();
  let parsedBody: unknown;
  try {
    parsedBody = text ? JSON.parse(text) : {};
  } catch {
    return jsonResponse({ error: 'Body must be JSON' }, 400);
  }
  const parsed = helloUserRequestSchema.safeParse(parsedBody);
  if (!parsed.success) {
    // Flatten zod issues into a short, safe-to-return message.
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.') || '(body)'}: ${i.message}`)
      .join('; ');
    return jsonResponse({ error: issues }, 400);
  }

  // Client bound to the caller's JWT: RLS applies as if they queried directly.
  // SUPABASE_URL / SUPABASE_ANON_KEY are injected automatically, locally by
  // `supabase functions serve` and in hosted deploys by the platform.
  const supabase = createClient<Database>(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY') ??
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!,
    {
      global: { headers: { Authorization: req.headers.get('Authorization')! } },
    },
  );

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const { data: profile, error: profileError } = await supabase
    .from('userprofiles')
    .select('nickname')
    .eq('id', userData.user.id)
    .maybeSingle();
  if (profileError) {
    return jsonResponse({ error: 'Failed to load profile' }, 500);
  }

  const body: HelloUserResponse = {
    message: buildGreeting(profile?.nickname, { loud: parsed.data.loud }),
    nickname: profile?.nickname ?? null,
  };
  return jsonResponse(body);
});
