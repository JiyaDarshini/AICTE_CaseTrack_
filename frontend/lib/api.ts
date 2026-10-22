const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export interface ApiRequestOptions extends RequestInit {
  ttl?: number; // TTL in milliseconds. Default is 15,000ms (15s) for GET requests.
  skipCache?: boolean; // If true, bypasses client-side cache and forces a fresh request.
}

// In-flight request map to prevent duplicate simultaneous outgoing requests
const inFlightRequests = new Map<string, Promise<any>>();

// Client-side in-memory response cache for idempotent GET requests
const responseCache = new Map<string, { data: any; expiry: number }>();

/**
 * Clears the API client-side in-memory cache.
 * If endpointPrefix is provided, only matching keys are removed.
 */
export function clearApiCache(endpointPrefix?: string): void {
  if (!endpointPrefix) {
    responseCache.clear();
  } else {
    for (const key of responseCache.keys()) {
      if (key.includes(endpointPrefix)) {
        responseCache.delete(key);
      }
    }
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const token = typeof window !== "undefined" ? localStorage.getItem("casetrack_token") : null;

  // On data-mutating requests (POST, PUT, PATCH, DELETE), automatically invalidate cached GET data
  if (method !== "GET") {
    responseCache.clear();
  }

  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const cacheKey = `${method}:${token ? token.slice(-16) : "anon"}:${normalizedEndpoint}`;
  const now = Date.now();
  const ttl = options.ttl !== undefined ? options.ttl : 15000;
  const canCache = method === "GET" && !options.skipCache && ttl > 0 && options.cache !== "no-store";

  // 1. Check in-memory cache for valid cached response
  if (canCache) {
    const cached = responseCache.get(cacheKey);
    if (cached && now < cached.expiry) {
      return cached.data as T;
    }
  }

  // 2. Check if identical request is currently in-flight to deduplicate concurrent requests
  if (canCache && inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey) as Promise<T>;
  }

  const fetchPromise = (async () => {
    try {
      const headers: Record<string, string> = {
        ...(options.headers as Record<string, string>),
      };

      if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
      }

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const url = `${API_BASE_URL}${normalizedEndpoint}`;
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
          localStorage.removeItem("casetrack_token");
          localStorage.removeItem("casetrack_user");
          window.location.href = "/login?session_expired=true";
        }
        throw new Error("Unauthorized. Please log in again.");
      }

      if (!response.ok) {
        let errorMsg = `Error ${response.status}: ${response.statusText}`;
        try {
          const errorJson = await response.json();
          errorMsg = errorJson.detail || errorJson.message || errorMsg;
        } catch (_) {}
        throw new Error(errorMsg);
      }

      // Handle file downloads
      const contentType = response.headers.get("content-type");
      if (
        contentType &&
        (contentType.includes("text/csv") ||
          contentType.includes("application/pdf") ||
          contentType.includes("application/vnd.openxmlformats"))
      ) {
        return (await response.blob()) as unknown as T;
      }

      const data = await response.json();

      // Store in cache if cacheable
      if (canCache) {
        responseCache.set(cacheKey, { data, expiry: Date.now() + ttl });
      }

      return data as T;
    } finally {
      if (canCache) {
        inFlightRequests.delete(cacheKey);
      }
    }
  })();

  if (canCache) {
    inFlightRequests.set(cacheKey, fetchPromise);
  }

  return fetchPromise;
}
