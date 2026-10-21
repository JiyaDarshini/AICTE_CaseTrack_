const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("casetrack_token") : null;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
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

  return response.json();
}
