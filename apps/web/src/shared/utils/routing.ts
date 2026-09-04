export interface LocationStateFrom {
  pathname?: string;
  search?: string;
  hash?: string;
}

/**
 * Validates and sanitizes a redirection target path.
 * Protects against open redirect attacks (e.g. protocol-relative URLs or backslash bypasses)
 * while preserving valid relative paths, query parameters, and hashes.
 */
export const getSafeRedirectPath = (from?: unknown, defaultPath = '/dashboard'): string => {
  if (!from || typeof from !== 'object') {
    return defaultPath;
  }

  const candidate = from as LocationStateFrom;
  if (typeof candidate.pathname !== 'string' || candidate.pathname.length === 0) {
    return defaultPath;
  }

  const { pathname } = candidate;
  const search = typeof candidate.search === 'string' ? candidate.search : '';
  const hash = typeof candidate.hash === 'string' ? candidate.hash : '';

  // Must be an internal relative path starting with a single '/'
  // Rejects protocol-relative '//', external schemes, and Windows backslashes '\'
  if (
    pathname.startsWith('/') &&
    !pathname.startsWith('//') &&
    !pathname.includes('\\') &&
    !pathname.includes(':')
  ) {
    return `${pathname}${search}${hash}`;
  }

  return defaultPath;
};
