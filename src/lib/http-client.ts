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
        throw new UpstreamApiError(`API request failed: ${response.status} ${response.statusText}`, response.status, baseUrl);
      }

      const contentType = response.headers.get('content-type');

      // Handle text responses (like WKT)
      if (contentType?.includes('text/plain')) {
        return (await response.text()) as T;
      }

      // Handle XML error responses (e.g., WFS ServiceExceptionReport returned on HTTP 200)
      if (contentType?.includes('text/xml') || contentType?.includes('application/xml')) {
        const text = await response.text();
        throw new UpstreamApiError(`API returned XML error response: ${text.substring(0, 200)}`, response.status, baseUrl);
      }

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof UpstreamApiError) throw error;

      if (error instanceof Error && error.name === 'AbortError') {
        throw new UpstreamApiError(`Request timeout after ${timeout}ms`, 0, baseUrl);
      }

      throw new UpstreamApiError(`Network error: ${error instanceof Error ? error.message : 'Unknown'}`, 0, baseUrl);
    }
  }

  return { request };
}
