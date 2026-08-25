const SESSION_EXPIRED_EVENT = "admin-session-expired"

// Error carrying the HTTP status (and whether the failure was a network-level
// one) so retry gates can tell auth failures (401/403 → worth a token refresh)
// apart from validation problems or connectivity loss (never log the user out
// because of those).
export class ApiStatusError extends Error {
  status: number
  isNetwork: boolean

  constructor(message: string, status = 0, isNetwork = false) {
    super(message)
    this.name = "ApiStatusError"
    this.status = status
    this.isNetwork = isNetwork
  }
}

// True when the error represents an authentication/authorization rejection —
// i.e. the only class of failure that justifies a token-refresh retry.
export function isAuthStatusError(error: unknown): boolean {
  if (error instanceof ApiStatusError) {
    return !error.isNetwork && (error.status === 401 || error.status === 403)
  }
  return (
    error instanceof Error &&
    /authentication token|invalid or expired token|unauthorized|forbidden|access denied|token expired/i.test(
      error.message,
    )
  )
}

export function dispatchSessionExpired() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
  }
}

export function isSessionExpiredError(error: unknown): boolean {
  return error instanceof Error && /session expired|please log in again/i.test(error.message)
}

export function isNetworkError(error: unknown): boolean {
  return error instanceof Error && /failed to fetch|networkerror|network request failed|fetch failed/i.test(error.message)
}

export function formatApiError(error: unknown): string {
  if (isSessionExpiredError(error)) {
    return ""
  }
  if (isNetworkError(error)) {
    return "Unable to reach the server. Please check your connection."
  }
  if (error instanceof Error) {
    const msg = error.message
    if (/validation|invalid|required|cannot be empty|must be/i.test(msg)) {
      return msg
    }
    if (/duplicate|already exists|taken/i.test(msg)) {
      return msg
    }
    if (/not found|does not exist/i.test(msg)) {
      return msg
    }
    if (/unauthorized|forbidden|access denied|permission/i.test(msg)) {
      return "You don't have permission to perform this action."
    }
    return msg
  }
  return "Something went wrong. Please try again."
}
