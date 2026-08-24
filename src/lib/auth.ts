import { dispatchSessionExpired } from "@/lib/apiError"

const API_BASE = "/api/proxy/auth";

type ApiEnvelope = Record<string, unknown>;

export interface AdminProfile {
  name: string;
  email: string;
  phone: string;
  role: string;
}

const SESSION_FLAG_KEY = "adminSession";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_KEY = "admin-rate-limits";

export const RATE_LIMIT_ERROR =
  "Too many attempts. You have reached the maximum of 5 tries. Please wait 1 minute and try again.";

const getRateLimitState = () => {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    return raw ? (JSON.parse(raw) as Record<string, { count: number; firstAttempt: number }>) : {};
  } catch {
    return {};
  }
};

const writeRateLimitState = (value: Record<string, { count: number; firstAttempt: number }>) => {
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(value));
};

export const getRemainingAttempts = (key: "login" | "password-change"): number => {
  const now = Date.now();
  const state = getRateLimitState();
  const current = state[key];

  if (!current || now - current.firstAttempt >= RATE_LIMIT_WINDOW_MS) {
    return RATE_LIMIT_MAX_ATTEMPTS;
  }

  return Math.max(0, RATE_LIMIT_MAX_ATTEMPTS - current.count);
};

const enforceRateLimit = (key: "login" | "password-change") => {
  const now = Date.now();
  const state = getRateLimitState();
  const current = state[key];

  if (current && now - current.firstAttempt < RATE_LIMIT_WINDOW_MS) {
    if (current.count >= RATE_LIMIT_MAX_ATTEMPTS) {
      throw new Error(RATE_LIMIT_ERROR);
    }
    state[key] = { count: current.count + 1, firstAttempt: current.firstAttempt };
    writeRateLimitState(state);
    return;
  }

  state[key] = { count: 1, firstAttempt: now };
  writeRateLimitState(state);
};

const clearRateLimit = (key: "login" | "password-change") => {
  const state = getRateLimitState();
  delete state[key];
  writeRateLimitState(state);
};

// The backend wraps every response in { success, message, data, errors }.
const getData = (response: ApiEnvelope): ApiEnvelope => {
  if (!response || typeof response !== "object") return {};
  const data = response.data;
  if (data && typeof data === "object" && !Array.isArray(data)) return data as ApiEnvelope;
  return {};
};

const getErrorMessage = (response: unknown) => {
  if (!response || typeof response !== "object") return "Something went wrong."
  const body = response as ApiEnvelope;

  if (Array.isArray(body.errors) && body.errors.length > 0) {
    const firstError = body.errors[0];
    if (firstError && typeof firstError === "object") {
      const message = (firstError as { message?: string }).message;
      if (message) return message;
    }
    return String(firstError);
  }

  if (body.error && typeof body.error === "object") {
    const message = (body.error as { message?: string }).message;
    if (message) return message;
  }

  return String(body.message ?? body.error ?? body.msg ?? "Something went wrong.");
};

// The access token is returned in the JSON body; the refresh token is only
// delivered as an HttpOnly cookie (Set-Cookie) which the browser stores and
// replays automatically on same-origin requests to /api/proxy/*.
const storeAccessToken = (response: ApiEnvelope) => {
  const data = getData(response);
  const accessToken =
    data.accessToken ?? data.access_token ?? data.token ?? data.accessTokenValue;

  if (typeof accessToken === "string" && accessToken) {
    localStorage.setItem("accessToken", accessToken);
  }
};

const markSession = () => {
  localStorage.setItem(SESSION_FLAG_KEY, "1");
};

const clearSessionFlag = () => {
  localStorage.removeItem(SESSION_FLAG_KEY);
};

export const clearTokens = () => {
  localStorage.removeItem("accessToken");
  clearSessionFlag();
};

const request = async (path: string, init: RequestInit = {}) => {
  const headers = new Headers(init.headers ?? undefined);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: "include" }).catch((err) => {
    const message = err instanceof Error ? err.message : "Failed to fetch"
    throw new Error(/failed to fetch|networkerror|network request failed|fetch failed/i.test(message)
      ? "Unable to reach the server. Please check your connection."
      : message)
  })
  const bodyText = await response.text();
  let body: ApiEnvelope = {};

  if (bodyText) {
    try {
      body = JSON.parse(bodyText) as ApiEnvelope;
    } catch {
      body = {};
    }
  }

  if (!response.ok) {
    const msg = getErrorMessage(body);
    if (/too many|rate limit|too many attempts/i.test(msg)) {
      throw new Error("Too many attempts. Please wait a moment and try again.");
    }
    throw new Error(msg);
  }

  return body;
};

export async function login(email: string, password: string) {
  if (!email.trim() || !password.trim()) throw new Error("Email and password are required.");
  enforceRateLimit("login");

  try {
    const response = await request("/login", {
      method: "POST",
      body: JSON.stringify({ email: email.trim(), password }),
    });
    storeAccessToken(response);
    markSession();
    clearRateLimit("login");

    const accessToken = localStorage.getItem("accessToken") ?? "";
    return { accessToken, refreshToken: "" };
  } catch (error) {
    clearRateLimit("login");
    throw error instanceof Error ? error : new Error("Unable to log in.");
  }
}

export async function refreshToken() {
  try {
    const response = await request("/refresh-token", { method: "POST" });

    storeAccessToken(response);
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      clearTokens();
      dispatchSessionExpired();
      throw new Error("Session expired. Please log in again.");
    }

    return { accessToken, refreshToken: "" };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (/logged out|no refresh|session expired|already logged|refresh token/i.test(msg)) {
      clearTokens();
      dispatchSessionExpired();
    }
    throw error instanceof Error ? error : new Error("Unable to refresh session.");
  }
}

export async function authenticatedRequest(path: string, init: RequestInit = {}) {
  const token = localStorage.getItem("accessToken");
  if (!token) {
    clearTokens();
    dispatchSessionExpired();
    throw new Error("Session expired. Please log in again.");
  }

  const makeRequest = () => {
    const headers = new Headers(init.headers ?? undefined);
    headers.set("Accept", "application/json");
    if (token) headers.set("token", `Bearer ${token}`);
    return request(path, { ...init, headers });
  };

  try {
    return await makeRequest();
  } catch (error) {
    if (!(error instanceof Error) || !/token|unauthoriz|forbidden|expired/i.test(error.message)) {
      throw error;
    }
    const refreshed = await refreshToken().catch(() => null);
    if (!refreshed) {
      clearTokens();
      dispatchSessionExpired();
      throw new Error("Session expired. Please log in again.");
    }
    return makeRequest();
  }
}

export async function logout() {
  try {
    // The backend clears the refresh-token cookie in response.
    await authenticatedRequest("/logout", { method: "POST" }).catch(() => undefined);
  } finally {
    clearTokens();
    clearRateLimit("login");
  }
}

export async function getProfile(): Promise<AdminProfile> {
  const response = await authenticatedRequest("/profile");
  const data = getData(response);
  // Backend returns the admin object under data.admin.
  const user = (data.admin as Record<string, unknown> | undefined) ?? data;

  return {
    name: String(user.name ?? user.fullName ?? "Admin User"),
    email: String(user.email ?? ""),
    phone: String(user.phone ?? user.phoneNumber ?? ""),
    role: String(user.role ?? "Administrator"),
  };
}

export async function updateProfile(profile: AdminProfile) {
  const response = await authenticatedRequest("/profile", {
    method: "PUT",
    body: JSON.stringify({
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
    }),
  });

  const data = getData(response);
  const user = (data.admin as Record<string, unknown> | undefined) ?? data;

  return {
    name: String(user.name ?? profile.name),
    email: String(user.email ?? profile.email),
    phone: String(user.phone ?? profile.phone),
    role: String(user.role ?? profile.role),
  };
}

export async function changePassword(currentPassword: string, newPassword: string, confirmPassword: string) {
  enforceRateLimit("password-change");
  try {
    await authenticatedRequest("/change-password", {
      method: "POST",
      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmPassword,
      }),
    });
    clearRateLimit("password-change");
  } catch (error) {
    clearRateLimit("password-change");
    throw error instanceof Error ? error : new Error("Unable to change password.");
  }
}

export const hasSession = () =>
  Boolean(localStorage.getItem("accessToken") || localStorage.getItem(SESSION_FLAG_KEY));