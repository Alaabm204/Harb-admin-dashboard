import React, { useState, useRef, useEffect } from "react"
import type { Lang } from "./ui"
import type { AdminProfile } from "@/lib/auth"
const logoImg = "/logo.png"

// ─── Nav items ────────────────────────────────────────────────────────────────
export type PageKey = "dashboard" | "products" | "categories" | "services" | "projects" | "clients" | "messages" | "homepage" | "settings" | "profile"

const NAV: { key: PageKey; en: string; ar: string; icon: React.ReactNode }[] = [
  {
    key: "dashboard",
    en: "Dashboard",
    ar: "لوحة التحكم",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    key: "products",
    en: "Products",
    ar: "المنتجات",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    key: "categories",
    en: "Categories",
    ar: "الفئات",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    key: "services",
    en: "Services",
    ar: "الخدمات",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93A10 10 0 014.93 19.07M4.93 4.93a10 10 0 0114.14 14.14" />
      </svg>
    ),
  },
  {
    key: "projects",
    en: "Projects",
    ar: "المشروعات",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    ),
  },
  {
    key: "clients",
    en: "Clients",
    ar: "العملاء",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    key: "messages",
    en: "Contact Messages",
    ar: "رسائل التواصل",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    key: "homepage",
    en: "Homepage",
    ar: "الصفحة الرئيسية",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    key: "settings",
    en: "Company Settings",
    ar: "إعدادات الشركة",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
  {
    key: "profile",
    en: "Profile",
    ar: "الملف الشخصي",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
]

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({
  collapsed,
  activePage,
  onNavigate,
  onLogout,
  mobile,
  onClose,
}: {
  collapsed: boolean
  activePage: PageKey
  onNavigate: (p: PageKey) => void
  onLogout: () => void
  mobile?: boolean
  onClose?: () => void
}) {
  const lang = "en"
  return (
    <aside
      style={{
        width: mobile ? 260 : collapsed ? 68 : 260,
        background: "var(--primary)",
      }}
      className="flex flex-col h-full flex-shrink-0 transition-all duration-200 overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10 min-h-[60px]">
        <img
          src={logoImg}
          alt="HARB Group"
          className="w-9 h-9 object-contain flex-shrink-0 rounded bg-white p-0.5"
        />
        {(!collapsed || mobile) && (
          <div className="overflow-hidden">
            <div className="text-white font-bold text-sm leading-tight">
              H.C.A.G.S
            </div>
            <div className="text-white/60 text-[10px] leading-tight whitespace-nowrap">
              Harb Contracting
            </div>
          </div>
        )}
        {mobile && (
          <button
            onClick={onClose}
            className="ms-auto text-white/60 hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV.map((item) => {
          const active = activePage === item.key
          return (
            <button
              key={item.key}
              onClick={() => {
                onNavigate(item.key)
                onClose?.()
              }}
              className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium transition-colors relative group ${
                active
                  ? "bg-white/10 text-white"
                  : "text-white/65 hover:bg-white/8 hover:text-white"
              }`}
              title={
                collapsed && !mobile
                  ? lang === "en"
                    ? item.en
                    : item.ar
                  : undefined
              }
            >
              {active && (
                <span className="absolute start-0 top-1 bottom-1 w-0.5 bg-[var(--accent)] rounded-full" />
              )}
              <span className="flex-shrink-0">{item.icon}</span>
              {(!collapsed || mobile) && (
                <span className="truncate">
                  {lang === "en" ? item.en : item.ar}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-white/10 p-3">
        <button
          onClick={onLogout}
          className={`flex items-center gap-3 w-full px-3 py-2 rounded text-sm text-white/65 hover:bg-white/10 hover:text-white transition-colors`}
          title={
            collapsed && !mobile
              ? lang === "en"
                ? "Logout"
                : "تسجيل الخروج"
              : undefined
          }
        >
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {(!collapsed || mobile) && (
            <span>{lang === "en" ? "Logout" : "تسجيل الخروج"}</span>
          )}
        </button>
      </div>
    </aside>
  )
}

// ─── Topbar ───────────────────────────────────────────────────────────────────
function Topbar({
  activePage,
  onToggleSidebar,
  onNavigate,
  onLogout,
  profile,
}: {
  activePage: PageKey
  onToggleSidebar: () => void
  onNavigate: (p: PageKey) => void
  onLogout: () => void
  profile?: AdminProfile
}) {
  const lang = "en"
  const [profileOpen, setProfileOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const displayName = profile?.name || "Admin User"
  const displayEmail = profile?.email || "admin@harbgroup.com"
  const initial = displayName.charAt(0).toUpperCase() || "A"

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setProfileOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const nav = NAV.find((n) => n.key === activePage)
  const pageLabel = nav ? (lang === "en" ? nav.en : nav.ar) : ""

  return (
    <header className="flex items-center gap-4 px-5 bg-white border-b border-[var(--border)] h-[60px] flex-shrink-0">
      {/* Toggle */}
      <button
        onClick={onToggleSidebar}
        className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        <svg
          viewBox="0 0 24 24"
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm flex-1 min-w-0">
        <span className="text-[var(--text-muted)]">
          {lang === "en" ? "Admin" : "المشرف"}
        </span>
        <svg
          viewBox="0 0 24 24"
          className="w-3 h-3 text-[var(--text-muted)] rtl:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
        <span className="font-medium text-[var(--text-primary)] truncate">
          {pageLabel}
        </span>
      </div>

      {/* Profile */}
      <div className="relative" ref={ref}>
        <button
          onClick={() => setProfileOpen((o) => !o)}
          className="flex items-center gap-2 group"
        >
          <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-xs font-bold">
            {initial}
          </div>
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4 text-[var(--text-muted)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {profileOpen && (
          <div className="absolute end-0 top-full mt-2 w-48 bg-white border border-[var(--border)] rounded-lg shadow-lg z-30 py-1">
            <div className="px-3 py-2 border-b border-[var(--border)]">
              <p className="text-xs font-semibold text-[var(--text-primary)]">
                {displayName}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {displayEmail}
              </p>
            </div>
            <button
              onClick={() => {
                onNavigate("profile")
                setProfileOpen(false)
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] text-start"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              {lang === "en" ? "Profile" : "الملف الشخصي"}
            </button>
            <button
              onClick={() => {
                onNavigate("profile")
                setProfileOpen(false)
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] text-start"
            >
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
              {lang === "en" ? "Change Password" : "تغيير كلمة المرور"}
            </button>
            <div className="border-t border-[var(--border)] mt-1" />
            <button
              onClick={onLogout}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--error)] hover:bg-[var(--error-light)] text-start"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              {lang === "en" ? "Logout" : "تسجيل الخروج"}
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

// ─── AdminLayout ──────────────────────────────────────────────────────────────
interface AdminLayoutProps {
  activePage: PageKey
  onNavigate: (p: PageKey) => void
  onLogout: () => void
  profile?: AdminProfile
  children: React.ReactNode
}

export default function AdminLayout({
  activePage,
  onNavigate,
  onLogout,
  profile,
  children,
}: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div
        className="hidden md:flex flex-shrink-0 transition-all duration-200"
        style={{ width: collapsed ? 68 : 260 }}
      >
        <Sidebar
          collapsed={collapsed}
          activePage={activePage}
          onNavigate={onNavigate}
          onLogout={onLogout}
        />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex" style={{ width: 260 }}>
            <Sidebar
              collapsed={false}
              activePage={activePage}
              onNavigate={onNavigate}
              onLogout={onLogout}
              mobile
              onClose={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar
          activePage={activePage}
          onToggleSidebar={() => {
            if (window.innerWidth < 768) setMobileOpen((o) => !o)
            else setCollapsed((o) => !o)
          }}
          onNavigate={onNavigate}
          onLogout={onLogout}
          profile={profile}
        />
        <main className="flex-1 overflow-y-auto p-5 md:p-6">{children}</main>
      </div>
    </div>
  )
}
