import { describe, it, expect } from 'vitest';
import { safeRedirectPath } from '@/lib/utilities/url-utility';

describe('safeRedirectPath', () => {
  it('allows same-origin relative paths', () => {
    expect(safeRedirectPath('/protected')).toBe('/protected');
    expect(safeRedirectPath('/a/b?x=1#h')).toBe('/a/b?x=1#h');
  });

  it('falls back for absolute and protocol-relative URLs', () => {
    expect(safeRedirectPath('https://evil.com')).toBe('/');
    expect(safeRedirectPath('http://evil.com')).toBe('/');
    expect(safeRedirectPath('//evil.com')).toBe('/');
    expect(safeRedirectPath('javascript:alert(1)')).toBe('/');
  });

  it('falls back for backslash and scheme tricks', () => {
    expect(safeRedirectPath('/\\evil.com')).toBe('/');
    expect(safeRedirectPath('/x://evil.com')).toBe('/');
  });

  it('falls back for non-rooted or empty values', () => {
    expect(safeRedirectPath('protected')).toBe('/');
    expect(safeRedirectPath('')).toBe('/');
    expect(safeRedirectPath(null)).toBe('/');
    expect(safeRedirectPath(undefined)).toBe('/');
  });

  it('honors a custom fallback', () => {
    expect(safeRedirectPath('https://evil.com', '/login')).toBe('/login');
    expect(safeRedirectPath(null, '/login')).toBe('/login');
  });
});
