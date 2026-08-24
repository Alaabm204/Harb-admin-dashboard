import React, { useEffect, useState } from "react"
import {
  Button,
  SearchBar,
  StatusBadge,
  Table,
  Th,
  Td,
  Tr,
  Pagination,
  Modal,
  ConfirmModal,
  EmptyState,
  PageHeader,
  SectionCard,
  Input,
  ImageUploader,
  Switch,
  ActionsDropdown,
  EditIcon,
  DeleteIcon,
} from "@/components/ui"
import {
  createProject,
  deleteProject,
  deleteProjectImage,
  getProjects,
  updateProject,
  uploadProjectImages,
  getStoredProjectImages,
  type Project,
  type ProjectImage,
} from "@/lib/projects"
import { formatApiError } from "@/lib/apiError"

const PER_PAGE = 10

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState({
    nameEn: "",
    nameAr: "",
    year: "",
    client: "",
    available: true,
  })
  const [existingImages, setExistingImages] = useState<ProjectImage[]>([])
  const [pendingUploads, setPendingUploads] = useState<Array<{ file: File; previewUrl: string }>>([])
  const [error, setError] = useState("")

  useEffect(() => {
    const loadProjects = async () => {
      setLoading(true)
      setError("")
      try {
        const result = await getProjects({ search, page, perPage: PER_PAGE })
        setProjects(result.items)
        setTotal(result.total)
      } catch (err) {
        setError(formatApiError(err) || "Unable to load projects.")
        setProjects([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    }

    void loadProjects()
  }, [search, page])

  const refreshProjects = async (nextPage: number) => {
    const result = await getProjects({ search, page: nextPage, perPage: PER_PAGE })
    setProjects(result.items)
    setTotal(result.total)
    setPage(nextPage)
  }

  const openAdd = () => {
    setForm({
      nameEn: "",
      nameAr: "",
      year: new Date().getFullYear().toString(),
      client: "",
      available: true,
    })
    setEditId(null)
    setExistingImages([])
    setPendingUploads([])
    setFormOpen(true)
  }

  const openEdit = (p: Project) => {
    setForm({
      nameEn: p.nameEn,
      nameAr: p.nameAr,
      year: p.year,
      client: p.client,
      available: p.available,
    })
    setEditId(p.id)
    const storedImages = getStoredProjectImages(p.id)
    const imageIdMap = new Map(storedImages.map((img) => [img.url, img.id]))
    const merged = p.images.map((img) => ({
      ...img,
      id: img.id ?? imageIdMap.get(img.url),
    }))
    setExistingImages(merged)
    setPendingUploads([])
    setFormOpen(true)
  }

  const handleSave = async () => {
    if (!form.nameEn.trim() || !form.nameAr.trim()) return

    setSaving(true)
    setError("")
    try {
      if (editId) {
        await updateProject(editId, {
          nameEn: form.nameEn.trim(),
          nameAr: form.nameAr.trim(),
          year: form.year.trim(),
          client: form.client.trim(),
          available: form.available,
        })

        if (pendingUploads.length) {
          await uploadProjectImages(editId, pendingUploads.map((item) => item.file))
        }
      } else {
        const created = await createProject({
          nameEn: form.nameEn.trim(),
          nameAr: form.nameAr.trim(),
          year: form.year.trim(),
          client: form.client.trim(),
          available: form.available,
        })

        if (pendingUploads.length) {
          await uploadProjectImages(created.id, pendingUploads.map((item) => item.file))
        }
      }

      setFormOpen(false)
      await refreshProjects(1)
    } catch (err) {
      setError(formatApiError(err) || "Unable to save project.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return

    setError("")
    try {
      await deleteProject(deleteId)
      setDeleteId(null)
      await refreshProjects(page)
    } catch (err) {
      setError(formatApiError(err) || "Unable to delete project.")
    }
  }

  const imagePreviews = [
    ...existingImages.map((img) => img.url),
    ...pendingUploads.map((item) => item.previewUrl),
  ]

  const handleRemoveImage = async (index?: number) => {
    const idx = typeof index === "number" ? index : 0
    if (idx < existingImages.length) {
      const img = existingImages[idx]
      if (editId && img.id) {
        try {
          await deleteProjectImage(editId, img.id)
          await refreshProjects(page)
        } catch (err) {
          setError(formatApiError(err) || "Unable to delete project image.")
          return
        }
      } else if (editId) {
        setError("This image can't be deleted from the server because its ID is unknown. It will reappear after reload.")
      }
      setExistingImages((current) => current.filter((_, i) => i !== idx))
      return
    }

    const pendingIndex = idx - existingImages.length
    setPendingUploads((current) => current.filter((_, i) => i !== pendingIndex))
  }

  return (
    <div>
      <PageHeader
        title="Projects"
        breadcrumb="Admin / Projects"
        action={
          <Button variant="accent" onClick={openAdd}>Add Project</Button>
        }
      />

      <div className="mb-4">
        <SearchBar
          value={search}
          onChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          placeholder="Search projects…"
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
          <div className="p-8 text-sm text-[var(--text-muted)]">Loading projects…</div>
        ) : projects.length === 0 ? (
          <EmptyState title="No projects yet." desc="You haven't added any projects." action={<Button variant="accent" onClick={openAdd}>Add Project</Button>} />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Cover</Th>
                  <Th>Project Name</Th>
                  <Th>Year</Th>
                  <Th>Client</Th>
                  <Th>Status</Th>
                  <Th className="text-end">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <Tr key={p.id}>
                    <Td>
                      <div className="w-12 h-10 rounded bg-[var(--surface-secondary)] border border-[var(--border)] flex items-center justify-center overflow-hidden">
                        {p.imageUrls[0] ? (
                          <img src={p.imageUrls[0]} alt={p.nameEn} className="w-full h-full object-cover" />
                        ) : (
                          <svg viewBox="0 0 24 24" className="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <p className="font-medium text-[var(--text-primary)]">{p.nameEn}</p>
                      <p className="text-xs text-[var(--text-muted)]" dir="rtl">{p.nameAr}</p>
                    </Td>
                    <Td>
                      <span className="text-[var(--text-muted)] font-mono text-xs">{p.year || "—"}</span>
                    </Td>
                    <Td>
                      <span className="text-[var(--text-secondary)] text-sm">{p.client || "—"}</span>
                    </Td>
                    <Td>
                      <StatusBadge variant={p.available ? "active" : "inactive"} label={p.available ? "Active" : "Inactive"} />
                    </Td>
                    <Td>
                      <div className="flex justify-end">
                        <ActionsDropdown items={[
                          { label: "Edit", icon: <EditIcon />, onClick: () => openEdit(p) },
                          { label: "Delete", icon: <DeleteIcon />, onClick: () => setDeleteId(p.id), danger: true },
                        ]} />
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

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editId ? "Edit Project" : "Add Project"} width="max-w-2xl">
        <div className="space-y-4">
          <SectionCard title="Project Information">
            <div className="space-y-3">
              <Input label="Project Name (English)" value={form.nameEn} onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))} placeholder="e.g. Al-Riyadh Tower Structure" />
              <Input label="Project Name (Arabic)" value={form.nameAr} onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))} placeholder="مثلاً: هيكل برج الرياض" dir="rtl" className="text-right" />
            </div>
          </SectionCard>
          <SectionCard title="Project Details">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Completion Year" type="number" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} placeholder="2024" min="1900" max="2100" />
              <Input label="Client Name" value={form.client} onChange={(e) => setForm((f) => ({ ...f, client: e.target.value }))} placeholder="Client name" />
            </div>
            <div className="mt-3">
              <Switch
                checked={form.available}
                onChange={(v) => setForm((f) => ({ ...f, available: v }))}
                label="Active"
              />
            </div>
          </SectionCard>
          <SectionCard title="Project Images">
            <ImageUploader onUpload={(files) => {
              if (!files.length) return
              setPendingUploads((current) => [
                ...current,
                ...files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
              ])
            }} preview={imagePreviews} onRemove={handleRemoveImage} multiple />
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Images must be between 200×200 and 4000×4000 pixels. Up to 10 files per upload.
            </p>
          </SectionCard>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-[var(--border)]">
          <Button variant="ghost" onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button variant="accent" onClick={handleSave} loading={saving}>Save Project</Button>
        </div>
      </Modal>

      <ConfirmModal open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Project?" message="Are you sure you want to delete this project?" />
    </div>
  )
}