import type { NextConfig } from 'next';

// Supabase origin (and its websocket equivalent for Realtime) must be allowed by
// the CSP `connect-src`. Read from the raw env here because next.config runs
// before the validated `env` module and config is the one place that's OK.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseWs = supabaseUrl.replace(/^http/, 'ws');

/**
 * Content-Security-Policy — a pragmatic STARTING POINT, not a hardened policy.
 *
 * It intentionally allows `'unsafe-inline'`/`'unsafe-eval'` for scripts because
 * Next.js injects inline bootstrap scripts; a strict policy needs per-request
 * nonces wired through middleware. Tighten this per project (ideally move to a
 * nonce-based `script-src`) — see documentation/deployment.md. Verify auth flows
 * still work after any change.
 */
const contentSecurityPolicy = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob:`,
  `font-src 'self' data:`,
  `connect-src 'self' ${supabaseUrl} ${supabaseWs}`.trim(),
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
]
  .filter(Boolean)
  .join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
