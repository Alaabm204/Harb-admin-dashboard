import { useEffect, useMemo, useState } from "react"
import LoginPage from "@/views/LoginPage"
import AdminLayout from "@/components/Layout"
import type { PageKey } from "@/components/Layout"
import DashboardPage from "@/views/DashboardPage"
import ProductsPage from "@/views/ProductsPage"
import CategoriesPage from "@/views/CategoriesPage"
import ServicesPage from "@/views/ServicesPage"
import ProjectsPage from "@/views/ProjectsPage"
import ClientsPage from "@/views/ClientsPage"
import MessagesPage from "@/views/MessagesPage"
import HomepagePage from "@/views/HomepagePage"
import SettingsPage from "@/views/SettingsPage"
import ProfilePage from "@/views/ProfilePage"
import { getProfile, hasSession, logout, clearTokens, refreshToken, type AdminProfile } from "@/lib/auth"

export default function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [page, setPage] = useState<PageKey>("dashboard")
  const [loginError, setLoginError] = useState("")
  const [profile, setProfile] = useState<AdminProfile | null>(null)

  useEffect(() => {
    const init = async () => {
      if (!hasSession()) {
        try {
          await refreshToken()
          const p = await getProfile()
          setProfile(p)
          setAuthenticated(true)
        } catch {
          clearTokens()
          setAuthenticated(false)
        }
        setCheckingSession(false)
        return
      }
      getProfile()
        .then((p) => {
          setProfile(p)
          setAuthenticated(true)
        })
        .catch(() => {
          clearTokens()
          setAuthenticated(false)
        })
        .finally(() => setCheckingSession(false))
    }

    void init()
  }, [])

  useEffect(() => {
    const handler = () => {
      setAuthenticated(false)
    }
    window.addEventListener("admin-session-expired", handler)
    return () => window.removeEventListener("admin-session-expired", handler)
  }, [])

  useEffect(() => {
    if (!authenticated) return

    const REFRESH_INTERVAL_MS = 14 * 60 * 1000
    const intervalId = setInterval(() => {
      refreshToken().catch(() => {
        // If refresh fails (e.g. logged out), the session-expired
        // handler will clear the authenticated state.
      })
    }, REFRESH_INTERVAL_MS)

    return () => clearInterval(intervalId)
  }, [authenticated])

  const handleLogout = async () => {
    await logout().catch(() => undefined)
    setAuthenticated(false)
    setPage("dashboard")
  }

  const pageContent = useMemo(() => {
    switch (page) {
      case "dashboard":
        return <DashboardPage onNavigate={(p) => setPage(p as PageKey)} />
      case "products":
        return <ProductsPage />
      case "categories":
        return <CategoriesPage />
      case "services":
        return <ServicesPage />
      case "projects":
        return <ProjectsPage />
      case "clients":
        return <ClientsPage />
      case "messages":
        return <MessagesPage />
      case "homepage":
        return <HomepagePage />
      case "settings":
        return <SettingsPage />
      case "profile":
        return <ProfilePage />
      default:
        return <DashboardPage onNavigate={(p) => setPage(p as PageKey)} />
    }
  }, [page])

  if (checkingSession) return null

  if (!authenticated) {
    return <LoginPage onLogin={async () => {
      setCheckingSession(true)
      setLoginError("")
      try {
        const p = await getProfile()
        setProfile(p)
        setAuthenticated(true)
      } catch (error) {
        clearTokens()
        setLoginError(error instanceof Error ? error.message : "Unable to verify session. Please try again.")
      } finally {
        setCheckingSession(false)
      }
    }} loginError={loginError} />
  }

  return (
    <AdminLayout
      activePage={page}
      onNavigate={setPage}
      onLogout={handleLogout}
      profile={profile ?? undefined}
    >
      {pageContent}
    </AdminLayout>
  )
}
