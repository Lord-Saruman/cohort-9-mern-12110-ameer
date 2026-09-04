export interface LocationStateFrom {
  pathname?: string;
  search?: string;
  hash?: string;
}

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
