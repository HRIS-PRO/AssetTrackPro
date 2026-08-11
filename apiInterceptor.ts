/**
 * Utility to construct backend API URLs from environment variables
 * (VITE_BACKEND_URL or VITE_API_URL) across development and production environments.
 */
export function buildUrl(path: string): string {
  const envUrl = (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || '').trim();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (!envUrl || envUrl === '/api') {
    return normalizedPath;
  }

  const base = envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  let cleanPath = normalizedPath;

  // Strip leading '/api' from path since backend routes are registered at root (/assets, /auth, etc.)
  if (cleanPath.startsWith('/api/')) {
    cleanPath = cleanPath.substring(4);
  }

  return `${base}${cleanPath}`;
}

/**
 * Installs global fetch interceptor so that relative /api calls hit the configured backend URL.
 */
export function setupApiInterceptor() {
  if (typeof window === 'undefined') return;

  const originalFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    if (typeof input === 'string' && (input.startsWith('/api/') || input === '/api')) {
      return originalFetch(buildUrl(input), init);
    }
    if (input instanceof URL && input.pathname.startsWith('/api/')) {
      return originalFetch(buildUrl(input.pathname + input.search), init);
    }
    return originalFetch(input, init);
  };
}
