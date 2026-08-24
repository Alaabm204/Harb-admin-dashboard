import React, { useEffect, useState } from "react"
const logoImg = "/logo.png"
import { Button, Input } from "@/components/ui"
import { login, getRemainingAttempts, RATE_LIMIT_ERROR } from "@/lib/auth"

interface Props {
  onLogin: () => void | Promise<void>
  loginError?: string
}

export default function LoginPage({ onLogin, loginError }: Props) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [serverError, setServerError] = useState("")
  const [remainingAttempts, setRemainingAttempts] = useState(() => getRemainingAttempts("login"))

  useEffect(() => {
    setRemainingAttempts(getRemainingAttempts("login"))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailError("")
    setPasswordError("")
    setServerError("")

    if (remainingAttempts <= 0) {
      setServerError(RATE_LIMIT_ERROR)
      return
    }

    let valid = true
    if (!email.trim()) {
      setEmailError("Email address is required.")
      valid = false
    }
    if (!password) {
      setPasswordError("Password is required.")
      valid = false
    }
    if (!valid) return

    setLoading(true)
    try {
      await login(email.trim(), password)
      await onLogin()
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Unable to sign in.")
      setRemainingAttempts(getRemainingAttempts("login"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel – branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-[var(--primary)] p-12">
        <div className="flex items-center gap-3">
          <img
            src={logoImg}
            alt="H.C.A.G.S"
            className="w-12 h-12 object-contain bg-white rounded p-1"
          />
          <div>
            <div className="text-white font-bold text-lg">H.C.A.G.S</div>
            <div className="text-white/60 text-xs">
              Harb Contracting and General Supplies
            </div>
          </div>
        </div>
        <div>
          <h2 className="text-white text-4xl font-bold leading-tight mb-4">
            Content{"\n"}Management{"\n"}Dashboard
          </h2>
          <p className="text-white/60 text-sm max-w-sm">
            Manage your products, services, projects, and all website content
            from one place.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
          <div className="w-2 h-2 rounded-full bg-white/30" />
          <div className="w-2 h-2 rounded-full bg-white/30" />
        </div>
      </div>

      {/* Right panel – form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[var(--bg)]">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-8">
          <img
            src={logoImg}
            alt="H.C.A.G.S"
            className="w-10 h-10 object-contain bg-white rounded p-1 shadow"
          />
          <div>
            <div className="text-[var(--primary)] font-bold">H.C.A.G.S</div>
            <div className="text-[var(--text-muted)] text-xs">
              Harb Contracting
            </div>
          </div>
        </div>

        <div className="w-full max-w-sm bg-white rounded-lg border border-[var(--border)] shadow-sm p-8">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">
            Admin Portal
          </h1>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            Sign in to manage your website content
          </p>

          {(serverError || loginError) && (
            <div className="mb-4 rounded border border-[var(--error)]/30 bg-[var(--error-light)] p-3 text-sm text-[var(--error)]">
              {serverError || loginError}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4"
            noValidate
          >
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              autoComplete="email"
              error={emailError}
              icon={
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              }
            />
            <Input
              label="Password"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              error={passwordError}
              icon={
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              }
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="hover:text-[var(--primary)]"
                >
                  {showPw ? (
                    <svg
                      viewBox="0 0 24 24"
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              }
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-1"
              loading={loading}
            >
              {!loading && "Sign In"}
            </Button>

            {remainingAttempts <= 2 && remainingAttempts > 0 && (
              <p className="text-xs text-[var(--text-muted)] text-center">
                {remainingAttempts} attempt{remainingAttempts === 1 ? "" : "s"} remaining before temporary lockout.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
