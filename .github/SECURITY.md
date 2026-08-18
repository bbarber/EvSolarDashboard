# Security notes

Found a security issue in a project built from this template? Report it privately
to the team (not a public issue/PR), with enough detail to reproduce: affected
component, steps, and impact.

## Scope for projects built from this template

This is a starter template. A few security-relevant settings are intentionally
left for you to configure per project — verify these before shipping to
production:

- **Content-Security-Policy** in `next.config.ts` is a permissive starting
  point (allows inline scripts). Tighten it — ideally to a nonce-based policy.
- **Email confirmations** are disabled in the local Supabase stack
  (`supabase/config.toml`) for convenience; enable them on your hosted project.
- **Row Level Security** must be enabled with explicit policies on every table
  (the template enforces this for its example table — keep the pattern).
