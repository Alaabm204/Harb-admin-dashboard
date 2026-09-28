import React, { useEffect, useState } from "react"
import { Card, StatusBadge, Button } from "@/components/ui"
import { getDashboardStatistics } from "@/lib/dashboard"
import { getWeeklyVisitors, type WeeklyVisitors } from "@/lib/analytics"
import { getContactMessages } from "@/lib/contactMessages"
import { formatApiError } from "@/lib/apiError"
import { formatMessageDateTime } from "@/lib/formatDate"
import type { PageKey } from "@/components/Layout"

interface Props {
  onNavigate: (p: PageKey) => void
}

// Number of messages shown in the "Latest Contact Messages" table.
const LATEST_MESSAGES_LIMIT = 5

export default function DashboardPage({ onNavigate }: Props) {
  const [stats, setStats] = useState({ totalProducts: 0, totalProjects: 0, totalMessages: 0, unreadMessages: 0 })
  const [weekly, setWeekly] = useState<WeeklyVisitors>({ days: [], total: 0 })
  const [weeklyError, setWeeklyError] = useState("")
  const [messages, setMessages] = useState<Array<{ id: string; sender: string; email: string; date: string; read: boolean }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true)
        // Read the latest messages from the same contact-messages endpoint the
        // Messages page uses, so entries deleted there disappear here too (the
        // dedicated dashboard/recent-messages endpoint can serve stale rows).
        const [statistics, latestResult, weeklyVisitors] = await Promise.all([
          getDashboardStatistics(),
          getContactMessages({ page: 1, perPage: LATEST_MESSAGES_LIMIT }),
          // Visitor analytics must never blank the whole dashboard, so its
          // failure is captured separately instead of rejecting Promise.all.
          getWeeklyVisitors().catch((err) => {
            setWeeklyError(formatApiError(err) || "Unable to load visitor analytics.")
            return null
          }),
        ])
        const latest = [...latestResult.items]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, LATEST_MESSAGES_LIMIT)
          .map((m) => ({ id: m.id, sender: m.sender, email: m.email, date: m.date, read: m.read }))
        setStats(statistics)
        setMessages(latest)
        if (weeklyVisitors) {
          setWeekly(weeklyVisitors)
          setWeeklyError("")
        }
        setError("")
      } catch (err) {
        setError(formatApiError(err))
      } finally {
        setLoading(false)
      }
    }

    void loadDashboard()
  }, [])


  const statCards = [
    {
      label: "Total Products",
      value: stats.totalProducts,
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
        </svg>
      ),
      color: "var(--primary)",
    },
    {
      label: "Total Projects",
      value: stats.totalProjects,
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      ),
      color: "var(--accent)",
    },
    {
      label: "Contact Messages",
      value: stats.totalMessages,
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      ),
      color: "#7c3aed",
      badge: stats.unreadMessages,
    },
    {
      label: "Weekly Visitors",
      value: weekly.total,
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87" />
          <path d="M16 3.13a4 4 0 010 7.75" />
        </svg>
      ),
      color: "#0d9488",
    },
  ]

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs text-[var(--text-muted)] mb-0.5">Content Overview</p>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Welcome back, Admin</h1>
      </div>

      {error && (
        <div className="mb-4 rounded border border-[var(--error)]/30 bg-[var(--error-light)] p-3 text-sm text-[var(--error)]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((s) => (
          <Card key={s.label} className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: s.color + "18", color: s.color }}>
              {s.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{loading ? "—" : s.value}</p>
              <p className="text-xs text-[var(--text-muted)] font-medium">{s.label}</p>
            </div>
            {s.badge !== undefined && (
              <div className="ms-auto">
                <span className="bg-[var(--error)] text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {s.badge}
                </span>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Weekly Visitors</h2>
          <span className="text-xs text-[var(--text-muted)]">
            Total: <span className="font-semibold text-[var(--text-primary)]">{loading ? "—" : weekly.total}</span>
          </span>
        </div>
        <div className="px-5 py-5">
          {weeklyError ? (
            <div className="py-4 text-sm text-[var(--error)]">{weeklyError}</div>
          ) : loading ? (
            <div className="h-40 flex items-end gap-2 sm:gap-3">
              {[45, 70, 55, 85, 60, 75, 50].map((h, i) => (
                <div key={i} className="flex-1 h-full flex items-end">
                  <div className="w-full rounded-t bg-[var(--surface-secondary)] animate-pulse" style={{ height: `${h}%` }} />
                </div>
              ))}
            </div>
          ) : weekly.days.length === 0 || weekly.total === 0 ? (
            <div className="py-8 text-sm text-[var(--text-muted)] text-center">No visitor data for this week yet.</div>
          ) : (
            <div className="h-40 flex items-end gap-2 sm:gap-3">
              {weekly.days.map((d, i) => {
                const max = Math.max(...weekly.days.map((x) => x.value), 1)
                const pct = d.value > 0 ? Math.max((d.value / max) * 100, 8) : 3
                return (
                  <div
                    key={`${d.label}-${i}`}
                    className="flex-1 h-full flex flex-col items-center gap-1.5 min-w-0"
                    title={`${d.label}: ${d.value} visitors`}
                  >
                    <span className="text-[10px] font-semibold text-[var(--text-secondary)]">{d.value}</span>
                    <div className="w-full flex-1 flex items-end">
                      <div
                        className="w-full rounded-t transition-all"
                        style={{ height: `${pct}%`, backgroundColor: "var(--primary)" }}
                      />
                    </div>
                    <span className="w-full text-[10px] text-[var(--text-muted)] text-center truncate">{d.label}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Latest Contact Messages</h2>
          <Button variant="ghost" size="sm" onClick={() => onNavigate("messages")}>
            View All Messages
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="px-5 py-6 text-sm text-[var(--text-muted)]">Loading messages…</div>
          ) : messages.length === 0 ? (
            <div className="px-5 py-6 text-sm text-[var(--text-muted)]">No recent messages.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {['Sender', 'Date', 'Status'].map((h) => (
                    <th key={h} className="px-5 py-3 text-start text-xs font-semibold text-[var(--text-muted)] uppercase bg-[var(--surface-secondary)] border-b border-[var(--border)]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {messages.map((m) => (
                  <tr key={m.id} className={`hover:bg-[var(--surface-secondary)] transition-colors border-b border-[var(--divider)] ${!m.read ? 'bg-[var(--primary-light)]/30' : ''}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {!m.read && <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] flex-shrink-0" />}
                        <div>
                          <p className={`font-medium ${!m.read ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{m.sender}</p>
                          <p className="text-xs text-[var(--text-muted)]">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[var(--text-muted)] text-xs whitespace-nowrap">{formatMessageDateTime(m.date)}</td>
                    <td className="px-5 py-3">
                      <StatusBadge variant={m.read ? 'read' : 'unread'} label={m.read ? 'Read' : 'Unread'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}
