import { refreshToken, clearTokens } from "@/lib/auth"
import { dispatchSessionExpired } from "@/lib/apiError"

function extractErrorMessage(body: any): string {
  if (!body || typeof body !== "object") return "Request failed."

  if (Array.isArray(body.errors) && body.errors.length > 0) {
    const first = body.errors[0]
    if (first && typeof first === "object") {
      const msg = first.message ?? first.msg
      if (msg) return String(msg)
    }
    return String(body.errors[0])
  }

  if (body.error && typeof body.error === "object") {
    const msg = body.error.message ?? body.error.msg
    if (msg) return String(msg)
  }

  return String(body.message ?? body.error ?? body.msg ?? "Request failed.")
}

export function createAdminRequest() {
  const makeRequest = async <T>(url: string, init: RequestInit = {}): Promise<T> => {
    const headers = new Headers(init.headers ?? undefined);
    headers.set("Accept", "application/json");
    const token = localStorage.getItem("accessToken");
    if (token) headers.set("token", `Bearer ${token}`);
    if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    let response: Response
    try {
      response = await fetch(url, { ...init, headers, credentials: "include" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch"
      throw new Error(/failed to fetch|networkerror|network request failed|fetch failed/i.test(message)
        ? "Unable to reach the server. Please check your connection."
        : message)
    }
    const text = await response.text();
    let body: any = {};
    if (text) {
      try { body = JSON.parse(text); } catch { body = {}; }
    }
    if (!response.ok) {
      const msg = extractErrorMessage(body);
      throw new Error(msg);
    }
    return body as T;
  };

  return async function adminRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
    try {
      return await makeRequest<T>(url, init);
    } catch (error) {
      if (!(error instanceof Error) || !/token|unauthoriz|forbidden|expired|logged out/i.test(error.message)) {
        throw error;
      }
      const refreshed = await refreshToken().catch(() => null);
      if (!refreshed) {
        clearTokens();
        dispatchSessionExpired();
        throw new Error("Session expired. Please log in again.");
      }
      return makeRequest<T>(url, init);
    }
  };
}
