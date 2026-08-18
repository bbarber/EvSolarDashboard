import { describe, expect, it } from 'vitest';
import { buildGreeting } from './greeting';

// Runs in the ordinary Vitest unit suite (`pnpm run test:unit`), not Deno —
// see documentation/testing.md → "Edge Function tests".
describe('buildGreeting', () => {
  it('greets by nickname when present', () => {
    expect(buildGreeting('jsmith')).toBe('Hello, jsmith.');
  });

  it('trims whitespace and falls back when the nickname is blank', () => {
    expect(buildGreeting('  ')).toBe('Hello.');
  });

  it('falls back for null/undefined nicknames', () => {
    expect(buildGreeting(null)).toBe('Hello.');
    expect(buildGreeting(undefined)).toBe('Hello.');
  });

  it('shouts when asked to be loud', () => {
    expect(buildGreeting('jsmith', { loud: true })).toBe('HELLO, JSMITH.');
  });
});
