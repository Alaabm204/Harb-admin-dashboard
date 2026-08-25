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
import { getProfile, logout, clearTokens, refreshToken, type AdminProfile } from "@/lib/auth"

export default function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [page, setPage] = useState<PageKey>("dashboard")
  const [loginError, setLoginError] = useState("")
  const [profile, setProfile] = useState<AdminProfile | null>(null)

  useEffect(() => {
    const init = async () => {
      // getProfile() auto-recovers the access token from the refresh cookie
      // when missing/expired (see authenticatedRequest), so a plain call is
      // enough: the user stays logged in until logout or the refresh cookie's
      // lifetime ends.
      try {
        const p = await getProfile()
        setProfile(p)
        setAuthenticated(true)
      } catch {
        clearTokens()
        setAuthenticated(false)
      } finally {
        setCheckingSession(false)
      }
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

    // The backend's access-token TTL is 15 minutes; refresh every 10 minutes so
    // an idle open tab never lets the token lapse between requests.
    const REFRESH_INTERVAL_MS = 10 * 60 * 1000
    const intervalId = setInterval(() => {
      refreshToken().catch(() => {
        // Network drops are ignored (session stays alive). Definitive refresh
        // rejections dispatch the session-expired event, which clears auth.
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
