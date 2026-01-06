import { UpstreamApiError } from "./errors";

interface HttpClientConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * Create a typed HTTP client for API wrapping
 */
export function createHttpClient(config: HttpClientConfig) {
  const { baseUrl: rawBaseUrl, timeout = 30000, headers = {} } = config;

  // Ensure baseUrl ends with / for proper URL joining
  const baseUrl = rawBaseUrl.endsWith('/') ? rawBaseUrl : rawBaseUrl + '/';

  async function request<T>(
    path: string,
    options: {
      method?: "GET" | "POST";
      params?: Record<string, string | number | undefined>;
      body?: unknown;
    } = {}
  ): Promise<T> {
    const { method = "GET", params, body } = options;

    // Build URL with query params (strip leading / from path if present)
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    const url = new URL(cleanPath, baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
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
          "Accept": "application/json, text/plain, */*",
          ...headers
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new UpstreamApiError(
          `API request failed: ${response.status} ${response.statusText}`,
          response.status,
          rawBaseUrl
        );
      }

      // Handle text responses (like WKT)
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("text/plain")) {
        return await response.text() as T;
      }

      return await response.json() as T;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof UpstreamApiError) throw error;

      if (error instanceof Error && error.name === "AbortError") {
        throw new UpstreamApiError(
          `Request timeout after ${timeout}ms`,
          0,
          rawBaseUrl
        );
      }

      throw new UpstreamApiError(
        `Network error: ${error instanceof Error ? error.message : "Unknown"}`,
        0,
        rawBaseUrl
      );
    }
  }

  return { request };
}
