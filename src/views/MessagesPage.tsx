import React, { useEffect, useState } from "react"
import {
  Button,
  StatusBadge,
  SearchBar,
  Pagination,
  PageHeader,
  ConfirmModal,
} from "@/components/ui"
import { deleteMessage, getContactMessages, getMessageDetails, type ContactMessage } from "@/lib/contactMessages"
import { formatApiError } from "@/lib/apiError"

const PER_PAGE = 10

export default function MessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ContactMessage | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [error, setError] = useState("")

  const loadMessages = async () => {
    setLoading(true)
    try {
      const result = await getContactMessages({ search, page, perPage: PER_PAGE })
      setMessages(result.items)
      setTotal(result.total)
      setError("")
    } catch (err) {
      setError(formatApiError(err) || "Unable to load messages.")
      setMessages([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadMessages()
  }, [search, page])

  const openMessage = async (message: ContactMessage) => {
    try {
      const detail = await getMessageDetails(message.id)
      setSelected(detail)
      if (!message.read) {
        setMessages((current) =>
          current.map((item) => (item.id === message.id ? { ...item, read: true } : item)),
        )
      }
    } catch (err) {
      setSelected(message)
      setError(formatApiError(err) || "Unable to load the message details.")
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteMessage(deleteId)
      setDeleteId(null)
      setSelected(null)
      await loadMessages()
    } catch (err) {
      setError(formatApiError(err) || "Unable to delete this message.")
    }
  }

  const unreadCount = messages.filter((m) => !m.read).length

  if (selected) {
    return (
      <div>
        <div className="mb-4">
          <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-sm text-[var(--primary)] hover:underline">
            <svg viewBox="0 0 24 24" className="w-4 h-4 rtl:rotate-180" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Back to inbox
          </button>
        </div>
        <div className="bg-white border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-[var(--border)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                {selected.subject && (
                  <p className="font-semibold text-[var(--text-primary)] mb-2">{selected.subject}</p>
                )}
                <div className="flex flex-wrap gap-4 text-sm">
                  <span>
                    <span className="text-[var(--text-muted)]">From: </span>
                    <span className="font-medium">{selected.sender}</span>
                  </span>
                  <span>
                    <span className="text-[var(--text-muted)]">Email: </span>
                    <a href={`mailto:${selected.email}`} className="text-[var(--primary)] hover:underline">{selected.email}</a>
                  </span>
                  {selected.phone && (
                    <span>
                      <span className="text-[var(--text-muted)]">Phone: </span>
                      <span>{selected.phone}</span>
                    </span>
                  )}
                  <span>
                    <span className="text-[var(--text-muted)]">Date: </span>
                    <span>{selected.date}</span>
                  </span>
                </div>
              </div>
              <StatusBadge variant={selected.read ? "read" : "unread"} label={selected.read ? "Read" : "Unread"} />
            </div>
          </div>
          <div className="px-6 py-5">
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed whitespace-pre-line">{selected.body}</p>
          </div>
          <div className="px-6 py-4 bg-[var(--surface-secondary)] border-t border-[var(--border)] flex gap-2">
            <Button variant="danger" size="sm" onClick={() => setDeleteId(selected.id)} icon={
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" />
              </svg>
            }>
              Delete
            </Button>
          </div>
        </div>
        <ConfirmModal
          open={deleteId !== null}
          onClose={() => setDeleteId(null)}
          onConfirm={handleDelete}
          title="Delete Message?"
          message="Are you sure you want to delete this message?"
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Contact Messages"
        breadcrumb="Admin / Contact Messages"
        action={unreadCount > 0 ? <span className="text-sm text-[var(--text-muted)]">{unreadCount} unread</span> : undefined}
      />

      {error && (
        <div className="mb-4 rounded border border-[var(--error)]/30 bg-[var(--error-light)] p-3 text-sm text-[var(--error)]">
          {error}
        </div>
      )}

      <div className="mb-4">
        <SearchBar
          value={search}
          onChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          placeholder="Search messages…"
          className="w-64"
        />
      </div>

      <div className="bg-white border border-[var(--border)] rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-[var(--text-muted)]">Loading messages…</div>
        ) : messages.length === 0 ? (
          <div className="p-6 text-sm text-[var(--text-muted)]">No messages found.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {['Sender', 'Subject', 'Date', 'Status'].map((header) => (
                      <th key={header} className="px-5 py-3 text-start text-xs font-semibold text-[var(--text-muted)] uppercase bg-[var(--surface-secondary)] border-b border-[var(--border)]">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {messages.map((message) => (
                    <tr key={message.id} className="border-b border-[var(--divider)] hover:bg-[var(--surface-secondary)] cursor-pointer" onClick={() => void openMessage(message)}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {!message.read && <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] flex-shrink-0" />}
                          <div>
                            <p className={`font-medium ${!message.read ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{message.sender}</p>
                            <p className="text-xs text-[var(--text-muted)]">{message.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-[var(--text-secondary)] text-xs max-w-[220px] truncate">{message.subject || "—"}</td>
                      <td className="px-5 py-3 text-[var(--text-muted)] text-xs whitespace-nowrap">{message.date}</td>
                      <td className="px-5 py-3">
                        <StatusBadge variant={message.read ? "read" : "unread"} label={message.read ? "Read" : "Unread"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 pb-4">
              <Pagination page={page} total={total} perPage={PER_PAGE} onChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
