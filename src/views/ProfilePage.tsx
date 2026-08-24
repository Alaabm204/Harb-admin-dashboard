import React, { useEffect, useState } from "react"
import { Button, PageHeader, SectionCard, Input } from "@/components/ui"
import { changePassword, getProfile, updateProfile, getRemainingAttempts, RATE_LIMIT_ERROR, type AdminProfile } from "@/lib/auth"
import { formatApiError } from "@/lib/apiError"

const EMPTY_PROFILE: AdminProfile = {
  name: "",
  email: "",
  phone: "",
  role: "Administrator",
}

export default function ProfilePage() {
  const lang = "en"
  const [profile, setProfile] = useState<AdminProfile>(EMPTY_PROFILE)
  const [profileSaved, setProfileSaved] = useState(false)
  const [pw, setPw] = useState({ current: "", newPw: "", confirm: "" })
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)
  const [pwError, setPwError] = useState("")
  const [profileError, setProfileError] = useState("")
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [pwRemainingAttempts, setPwRemainingAttempts] = useState(() => getRemainingAttempts("password-change"))

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const nextProfile = await getProfile()
        setProfile({
          name: nextProfile.name || "",
          email: nextProfile.email || "",
          phone: nextProfile.phone || "",
          role: nextProfile.role || "Administrator",
        })
        setProfileError("")
      } catch (error) {
        const message = formatApiError(error)
        if (!message) {
          setProfileError("")
        } else {
          setProfileError(message)
        }
      } finally {
        setLoadingProfile(false)
      }
    }

    void loadProfile()
  }, [])

  useEffect(() => {
    setPwRemainingAttempts(getRemainingAttempts("password-change"))
  }, [pwError])

  const t = {
    title: lang === "en" ? "Profile" : "الملف الشخصي",
    profileInfo: lang === "en" ? "Profile Information" : "معلومات الملف الشخصي",
    changePw: lang === "en" ? "Change Password" : "تغيير كلمة المرور",
    name: lang === "en" ? "Full Name" : "الاسم الكامل",
    email: lang === "en" ? "Email Address" : "البريد الإلكتروني",
    phone: lang === "en" ? "Phone Number" : "رقم الهاتف",
    role: lang === "en" ? "Role" : "الدور",
    saveProfile: lang === "en" ? "Save Profile" : "حفظ الملف",
    current: lang === "en" ? "Current Password" : "كلمة المرور الحالية",
    newPw: lang === "en" ? "New Password" : "كلمة المرور الجديدة",
    confirm:
      lang === "en" ? "Confirm New Password" : "تأكيد كلمة المرور الجديدة",
    updatePw: lang === "en" ? "Update Password" : "تحديث كلمة المرور",
    profileSaved:
      lang === "en"
        ? "Profile saved successfully."
        : "تم حفظ الملف الشخصي بنجاح.",
    pwSaved:
      lang === "en"
        ? "Password updated successfully."
        : "تم تحديث كلمة المرور بنجاح.",
    pwMismatch:
      lang === "en" ? "Passwords do not match." : "كلمتا المرور غير متطابقتين.",
    pwTooShort:
      lang === "en"
        ? "Password must be at least 8 characters."
        : "يجب أن تكون كلمة المرور 8 أحرف على الأقل.",
    pwRequiredAll:
      lang === "en"
        ? "Please fill in all password fields."
        : "يرجى ملء جميع حقول كلمة المرور.",
  }

  const handleSaveProfile = async () => {
    setProfileSaved(false)
    setProfileError("")

    try {
      setSavingProfile(true)
      const updatedProfile = await updateProfile(profile)
      setProfile(updatedProfile)
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 3000)
    } catch (error) {
      const message = formatApiError(error)
      if (!message) {
        setProfileError("")
      } else {
        setProfileError(message)
      }
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePw = async () => {
    setPwError("")

    if (pwRemainingAttempts <= 0) {
      setPwError(RATE_LIMIT_ERROR)
      return
    }

    if (!pw.current || !pw.newPw || !pw.confirm) {
      setPwError(t.pwRequiredAll)
      return
    }
    if (pw.newPw.length < 8) {
      setPwError(t.pwTooShort)
      return
    }
    if (pw.newPw !== pw.confirm) {
      setPwError(t.pwMismatch)
      return
    }

    try {
      setChangingPassword(true)
      await changePassword(pw.current, pw.newPw, pw.confirm)
      setPwSaved(true)
      setPw({ current: "", newPw: "", confirm: "" })
      setTimeout(() => setPwSaved(false), 3000)
    } catch (error) {
      const message = formatApiError(error)
      if (!message) {
        setPwError("")
      } else {
        setPwError(message)
      }
    } finally {
      setChangingPassword(false)
    }
  }

  const EyeBtn = ({ show, toggle }: { show: boolean; toggle: () => void }) => (
    <button
      type="button"
      onClick={toggle}
      className="hover:text-[var(--primary)]"
    >
      {show ? (
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
  )

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={t.title}
        breadcrumb={lang === "en" ? "Admin / Profile" : "المشرف / الملف الشخصي"}
      />

      <div className="space-y-5">
        <div className="bg-white border border-[var(--border)] rounded-lg p-5 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-2xl font-bold flex-shrink-0">
            {profile.name ? profile.name.charAt(0).toUpperCase() : "A"}
          </div>
          <div>
            <p className="font-semibold text-[var(--text-primary)]">
              {loadingProfile ? "Loading profile..." : profile.name || "Admin User"}
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              {loadingProfile ? "Please wait" : profile.email || "admin@harbgroup.com"}
            </p>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[var(--primary-light)] text-[var(--primary)] mt-1">
              {profile.role || "Administrator"}
            </span>
          </div>
        </div>

        {profileError && (
          <div className="flex items-center gap-2 bg-[var(--error-light)] border border-[var(--error)]/20 rounded p-3">
            <svg
              className="w-4 h-4 text-[var(--error)] flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-xs text-[var(--error)]">{profileError}</p>
          </div>
        )}

        <SectionCard title={t.profileInfo}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label={t.name}
                value={profile.name}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, name: e.target.value }))
                }
              />
              <Input
                label={t.email}
                type="email"
                value={profile.email}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, email: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label={t.phone}
                value={profile.phone}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, phone: e.target.value }))
                }
              />
              <Input
                label={t.role}
                value={profile.role}
                disabled
                className="opacity-60 cursor-not-allowed"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[var(--border)]">
            {profileSaved && (
              <span className="text-xs text-[var(--success)] font-medium flex items-center gap-1">
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {t.profileSaved}
              </span>
            )}
            <Button
              variant="accent"
              onClick={handleSaveProfile}
              className="ms-auto"
              loading={savingProfile}
              disabled={loadingProfile}
            >
              {t.saveProfile}
            </Button>
          </div>
        </SectionCard>

        <SectionCard title={t.changePw}>
          {pwError && (
            <div className="flex items-center gap-2 bg-[var(--error-light)] border border-[var(--error)]/20 rounded p-3 mb-4">
              <svg
                className="w-4 h-4 text-[var(--error)] flex-shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-xs text-[var(--error)]">{pwError}</p>
            </div>
          )}
          <div className="space-y-3">
            <Input
              label={t.current}
              type={showCurrent ? "text" : "password"}
              value={pw.current}
              onChange={(e) =>
                setPw((p) => ({ ...p, current: e.target.value }))
              }
              suffix={
                <EyeBtn
                  show={showCurrent}
                  toggle={() => setShowCurrent((v) => !v)}
                />
              }
            />
            <Input
              label={t.newPw}
              type={showNew ? "text" : "password"}
              value={pw.newPw}
              onChange={(e) => setPw((p) => ({ ...p, newPw: e.target.value }))}
              suffix={
                <EyeBtn show={showNew} toggle={() => setShowNew((v) => !v)} />
              }
            />
            <Input
              label={t.confirm}
              type={showConfirm ? "text" : "password"}
              value={pw.confirm}
              onChange={(e) =>
                setPw((p) => ({ ...p, confirm: e.target.value }))
              }
              error={pw.confirm && pw.newPw !== pw.confirm ? t.pwMismatch : ""}
              suffix={
                <EyeBtn
                  show={showConfirm}
                  toggle={() => setShowConfirm((v) => !v)}
                />
              }
            />
          </div>

          {pwRemainingAttempts <= 2 && pwRemainingAttempts > 0 && (
            <p className="text-xs text-[var(--text-muted)]">
              {pwRemainingAttempts} attempt{pwRemainingAttempts === 1 ? "" : "s"} remaining before password change is temporarily locked.
            </p>
          )}
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[var(--border)]">
            {pwSaved && (
              <span className="text-xs text-[var(--success)] font-medium flex items-center gap-1">
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {t.pwSaved}
              </span>
            )}
            <Button
              variant="primary"
              onClick={handleChangePw}
              className="ms-auto"
              loading={changingPassword}
            >
              {t.updatePw}
            </Button>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
