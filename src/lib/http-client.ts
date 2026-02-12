import { UpstreamApiError } from './errors';

interface HttpClientConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * Create a typed HTTP client for API wrapping
 */
export function createHttpClient(config: HttpClientConfig) {
  const { baseUrl, timeout = 30000, headers = {} } = config;

  async function request<T>(
    path: string,
    options: {
      method?: 'GET' | 'POST';
      params?: Record<string, string | number | undefined>;
      body?: unknown;
    } = {},
  ): Promise<T> {
    const { method = 'GET', params, body } = options;

    // Build URL with query params (strip leading / from path if present)
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    const url = new URL(cleanPath, baseUrl.endsWith('/') ? baseUrl : baseUrl + '/');
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          url.searchParams.set(key, String(value));
        }
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url.toString(), {
        method,
        headers: {
          Accept: 'application/json, text/plain, */*',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const msg =
          response.status >= 500
            ? `The data service returned an error (HTTP ${response.status}). This is usually temporary — try again.`
            : `The data service rejected the request (HTTP ${response.status}). The query parameters may be invalid.`;
        throw new UpstreamApiError(msg, response.status, baseUrl);
      }

      const contentType = response.headers.get('content-type');

      // Handle text responses (like WKT)
      if (contentType?.includes('text/plain')) {
        return (await response.text()) as T;
      }

      // Handle XML error responses (e.g., WFS ServiceExceptionReport returned on HTTP 200)
      if (contentType?.includes('text/xml') || contentType?.includes('application/xml')) {
        throw new UpstreamApiError(
          'The data service returned an unexpected error response. Try again or use different parameters.',
          response.status,
          baseUrl,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof UpstreamApiError) throw error;

      if (error instanceof Error && error.name === 'AbortError') {
        throw new UpstreamApiError(
          'The request timed out. The data service may be slow — try again or use a smaller search area.',
          0,
          baseUrl,
        );
      }

      throw new UpstreamApiError('Could not connect to the data service. This is usually temporary — try again.', 0, baseUrl);
    }
  }

  return { request };
}
