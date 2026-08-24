import React, { useEffect, useState } from "react"
import {
  Button,
  Table,
  Th,
  Td,
  Tr,
  Pagination,
  SearchBar,
  Modal,
  ConfirmModal,
  EmptyState,
  PageHeader,
  SectionCard,
  Input,
  ImageUploader,
  StatusBadge,
  Switch,
  ActionsDropdown,
  EditIcon,
  DeleteIcon,
} from "@/components/ui"
import {
  createClient,
  deleteClient,
  getClients,
  updateClient,
  uploadClientLogo,
  deleteClientLogo,
  type Client,
} from "@/lib/clients"
import { formatApiError } from "@/lib/apiError"

const PER_PAGE = 10

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: "", active: true })
  const [logoPreview, setLogoPreview] = useState("")
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadClients = async () => {
      setLoading(true)
      setError("")
      try {
        const result = await getClients({ search, page, perPage: PER_PAGE })
        setClients(result.items)
        setTotal(result.total)
      } catch (err) {
        setError(formatApiError(err) || "Unable to load clients.")
        setClients([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    }

    void loadClients()
  }, [search, page])

  const openAdd = () => {
    setForm({ name: "", active: true })
    setLogoPreview("")
    setLogoFile(null)
    setEditId(null)
    setFormOpen(true)
  }

  const openEdit = (client: Client) => {
    setForm({ name: client.name, active: client.active })
    setLogoPreview(client.logoUrl)
    setLogoFile(null)
    setEditId(client.id)
    setFormOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return

    setSaving(true)
    setError("")

    try {
      let savedClient: Client

      if (editId) {
        savedClient = await updateClient(editId, form.name.trim(), form.active)
      } else {
        savedClient = await createClient(form.name.trim(), form.active)
      }

      if (logoFile) {
        const nextLogo = await uploadClientLogo(savedClient.id, logoFile)
        savedClient = { ...savedClient, logoUrl: nextLogo }
      }

      setFormOpen(false)
      const result = await getClients({ search, page: 1, perPage: PER_PAGE })
      setClients(result.items)
      setTotal(result.total)
      setPage(1)
    } catch (err) {
      setError(formatApiError(err) || "Unable to save client.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return

    setError("")
    try {
      await deleteClient(deleteId)
      setDeleteId(null)
      const result = await getClients({ search, page, perPage: PER_PAGE })
      setClients(result.items)
      setTotal(result.total)
    } catch (err) {
      setError(formatApiError(err) || "Unable to delete client.")
    }
  }

  return (
    <div>
      <PageHeader
        title="Clients"
        breadcrumb="Admin / Clients"
        action={
          <Button variant="accent" onClick={openAdd}>
            Add Client
          </Button>
        }
      />

      <div className="mb-4">
        <SearchBar
          value={search}
          onChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          placeholder="Search clients…"
          className="w-64"
        />
      </div>

      {error && (
        <div className="mb-4 rounded border border-[var(--error)]/30 bg-[var(--error-light)] p-3 text-sm text-[var(--error)]">
          {error}
        </div>
      )}

      <div className="bg-white border border-[var(--border)] rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-sm text-[var(--text-muted)]">Loading clients…</div>
        ) : clients.length === 0 ? (
          <EmptyState
            title="No clients yet."
            desc="You haven't added any clients."
            action={<Button variant="accent" onClick={openAdd}>Add Client</Button>}
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Logo</Th>
                  <Th>Client Name</Th>
                  <Th>Status</Th>
                  <Th className="text-end">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <Tr key={client.id}>
                    <Td>
                      <div className="w-10 h-10 rounded bg-[var(--surface-secondary)] border border-[var(--border)] flex items-center justify-center overflow-hidden">
                        {client.logoUrl ? (
                          <img src={client.logoUrl} alt={client.name} className="w-full h-full object-cover" />
                        ) : (
                          <svg viewBox="0 0 24 24" className="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                          </svg>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <p className="font-medium text-[var(--text-primary)]">{client.name}</p>
                    </Td>
                    {/* isActive flag returned by the backend. */}
                    <Td>
                      <StatusBadge variant={client.active ? "active" : "inactive"} label={client.active ? "Active" : "Inactive"} />
                    </Td>
                    <Td>
                      <div className="flex justify-end">
                        <ActionsDropdown
                          items={[
                            { label: "Edit", icon: <EditIcon />, onClick: () => openEdit(client) },
                            { label: "Delete", icon: <DeleteIcon />, onClick: () => setDeleteId(client.id), danger: true },
                          ]}
                        />
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <div className="px-5 pb-4">
              <Pagination page={page} total={total} perPage={PER_PAGE} onChange={setPage} />
            </div>
          </>
        )}
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editId ? "Edit Client" : "Add Client"} width="max-w-sm">
        <div className="space-y-4">
          <SectionCard title="Client Information">
            <Input
              label="Client Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Gulf Industries LLC"
            />
            <div className="pt-1">
              <Switch
                checked={form.active}
                onChange={(v) => setForm((f) => ({ ...f, active: v }))}
                label="Active"
              />
            </div>
          </SectionCard>
          <SectionCard title="Client Logo">
            <ImageUploader
              onUpload={([file]) => {
                if (!file) return
                setLogoFile(file)
                const reader = new FileReader()
                reader.onload = () => setLogoPreview(String(reader.result))
                reader.readAsDataURL(file)
              }}
              preview={logoPreview}
              onRemove={() => {
                setLogoPreview("")
                setLogoFile(null)
                if (editId) void deleteClientLogo(editId).catch(() => undefined)
              }}
            />
          </SectionCard>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="ghost" onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button variant="accent" onClick={handleSave} loading={saving}>Save Client</Button>
        </div>
      </Modal>

      <ConfirmModal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Client?"
        message="Are you sure you want to delete this client?"
      />
    </div>
  )
}
