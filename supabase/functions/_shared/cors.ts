/**
 * CORS helpers for browser-invoked Edge Functions. Functions are served from
 * the Supabase domain, so browser calls are always cross-origin — answer the
 * OPTIONS preflight and echo these headers on every response.
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  // Not strictly needed for POST-only functions (POST is CORS-safelisted),
  // but this helper is reused by future functions whose methods (PUT/DELETE/
  // PATCH) are not. CORS is not the auth boundary — handlers still enforce
  // method + JWT themselves.
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
} as const;

/** Standard preflight response; return this for `OPTIONS` requests. */
export function corsPreflightResponse(): Response {
  return new Response('ok', { headers: corsHeaders });
}

/** JSON response with CORS headers applied. */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
