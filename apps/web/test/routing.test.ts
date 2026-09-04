import { getSafeRedirectPath } from '../src/shared/utils/routing';

describe('routing utility - getSafeRedirectPath', () => {
  it('returns default /dashboard when candidate is missing or invalid', () => {
    expect(getSafeRedirectPath()).toBe('/dashboard');
    expect(getSafeRedirectPath(null)).toBe('/dashboard');
    expect(getSafeRedirectPath('string-not-object')).toBe('/dashboard');
    expect(getSafeRedirectPath({})).toBe('/dashboard');
    expect(getSafeRedirectPath({ pathname: '' })).toBe('/dashboard');
  });

  it('preserves valid relative paths, search queries, and hashes', () => {
    expect(getSafeRedirectPath({ pathname: '/dashboard' })).toBe('/dashboard');
    expect(getSafeRedirectPath({ pathname: '/notes', search: '?q=meeting', hash: '#top' })).toBe(
      '/notes?q=meeting#top',
    );
  });

  it('rejects protocol-relative open redirect attacks', () => {
    expect(getSafeRedirectPath({ pathname: '//evil.com' })).toBe('/dashboard');
    expect(getSafeRedirectPath({ pathname: '//attacker.example.com/steal' })).toBe('/dashboard');
  });

  it('rejects backslash open redirect attacks', () => {
    expect(getSafeRedirectPath({ pathname: '\\evil.com' })).toBe('/dashboard');
    expect(getSafeRedirectPath({ pathname: '/\\evil.com' })).toBe('/dashboard');
  });

  it('rejects scheme-based external URLs', () => {
    expect(getSafeRedirectPath({ pathname: 'https://evil.com' })).toBe('/dashboard');
    expect(getSafeRedirectPath({ pathname: 'javascript:alert(1)' })).toBe('/dashboard');
  });

  it('uses custom fallback defaultPath when specified', () => {
    expect(getSafeRedirectPath(null, '/custom-fallback')).toBe('/custom-fallback');
    expect(getSafeRedirectPath({ pathname: '//evil.com' }, '/custom-fallback')).toBe(
      '/custom-fallback',
    );
  });
});
