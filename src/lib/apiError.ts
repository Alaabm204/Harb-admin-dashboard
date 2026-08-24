const SESSION_EXPIRED_EVENT = "admin-session-expired"

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
