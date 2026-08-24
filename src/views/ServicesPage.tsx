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
  Textarea,
  ImageUploader,
  Switch,
  ActionsDropdown,
  EditIcon,
  DeleteIcon,
} from "@/components/ui"
import {
  createService,
  deleteService,
  deleteServiceImage,
  getServices,
  updateService,
  uploadServiceImage,
  type Service,
} from "@/lib/services"
import { formatApiError } from "@/lib/apiError"

interface FormData {
  nameEn: string
  nameAr: string
  descriptionEn: string
  descriptionAr: string
  active: boolean
  order: string
}

const emptyForm: FormData = {
  nameEn: "",
  nameAr: "",
  descriptionEn: "",
  descriptionAr: "",
  active: true,
  order: "1",
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [preview, setPreview] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const PER_PAGE = 10

  useEffect(() => {
    const loadServices = async () => {
      setLoading(true)
      setError("")

      try {
        const result = await getServices({ search, page, perPage: PER_PAGE })
        setServices(result.items)
        setTotal(result.total)
      } catch (err) {
        const message = formatApiError(err)
        if (!message) {
          setServices([])
          setTotal(0)
        } else {
          setError(message)
          setServices([])
          setTotal(0)
        }
      } finally {
        setLoading(false)
      }
    }

    void loadServices()
  }, [search, page])

  const openAdd = () => {
    setForm(emptyForm)
    setEditId(null)
    setPreview("")
    setImageFile(null)
    setFormOpen(true)
  }

  const openEdit = (service: Service) => {
    setForm({
      nameEn: service.nameEn,
      nameAr: service.nameAr,
      descriptionEn: service.descriptionEn,
      descriptionAr: service.descriptionAr,
      active: service.active,
      order: String(service.order),
    })
    setEditId(service.id)
    setPreview(service.imageUrl)
    setImageFile(null)
    setFormOpen(true)
  }

  const handleSave = async () => {
    if (!form.nameEn.trim() || !form.nameAr.trim()) return

    setSaving(true)
    setError("")

    try {
      let serviceId = editId

      if (editId) {
        await updateService(editId, {
          nameEn: form.nameEn.trim(),
          nameAr: form.nameAr.trim(),
          descriptionEn: form.descriptionEn.trim(),
          descriptionAr: form.descriptionAr.trim(),
          active: form.active,
          order: Number(form.order) || 0,
        })
      } else {
        const created = await createService({
          nameEn: form.nameEn.trim(),
          nameAr: form.nameAr.trim(),
          descriptionEn: form.descriptionEn.trim(),
          descriptionAr: form.descriptionAr.trim(),
          active: form.active,
          order: Number(form.order) || 0,
        })
        serviceId = created.id
        setEditId(created.id)
      }

      if (imageFile && serviceId) {
        await uploadServiceImage(serviceId, imageFile)
      }

      setFormOpen(false)
      const result = await getServices({ search, page: 1, perPage: PER_PAGE })
      setServices(result.items)
      setTotal(result.total)
      setPage(1)
    } catch (err) {
      const message = formatApiError(err)
      if (!message) {
        setError("")
      } else {
        setError(message)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return

    setError("")
    try {
      await deleteService(deleteId)
      setDeleteId(null)
      const result = await getServices({ search, page, perPage: PER_PAGE })
      setServices(result.items)
      setTotal(result.total)
    } catch (err) {
      const message = formatApiError(err)
      if (!message) {
        setError("")
      } else {
        setError(message)
      }
    }
  }

  const handleImageUpload = async (files: File[]) => {
    if (!files.length) return
    const file = files[0]
    setPreview(URL.createObjectURL(file))
    setImageFile(file)
  }

  const handleDeleteImage = async () => {
    if (!editId) {
      setPreview("")
      return
    }

    try {
      await deleteServiceImage(editId)
      setPreview("")
    } catch (err) {
      const message = formatApiError(err)
      if (!message) {
        setError("")
      } else {
        setError(message)
      }
    }
  }

  return (
    <div>
      <PageHeader
        title="Services"
        breadcrumb="Admin / Services"
        action={
          <Button
            variant="accent"
            onClick={openAdd}
            icon={
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            }
          >
            Add Service
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
          placeholder="Search services…"
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
          <div className="p-8 text-sm text-[var(--text-muted)]">Loading services…</div>
        ) : services.length === 0 ? (
          <EmptyState
            title="No services yet."
            desc="You haven't added any services."
            action={
              <Button variant="accent" onClick={openAdd}>
                Add Service
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Image</Th>
                  <Th>Service Name</Th>
                  <Th>Order</Th>
                  <Th>Status</Th>
                  <Th className="text-end">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <Tr key={service.id}>
                    <Td>
                      <div className="w-10 h-10 rounded bg-[var(--surface-secondary)] border border-[var(--border)] flex items-center justify-center overflow-hidden">
                        {service.imageUrl ? (
                          <img src={service.imageUrl} alt={service.nameEn} className="w-full h-full object-cover" />
                        ) : (
                          <svg
                            viewBox="0 0 24 24"
                            className="w-5 h-5 text-[var(--text-muted)]"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          >
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <p className="font-medium text-[var(--text-primary)]">{service.nameEn}</p>
                      <p className="text-xs text-[var(--text-muted)]" dir="rtl">{service.nameAr}</p>
                    </Td>
                    <Td>
                      <span className="font-mono text-xs text-[var(--text-muted)]">{service.order}</span>
                    </Td>
                    <Td>
                      <StatusBadge variant={service.active ? "active" : "inactive"} label={service.active ? "Active" : "Inactive"} />
                    </Td>
                    <Td>
                      <div className="flex justify-end">
                        <ActionsDropdown
                          items={[
                            {
                              label: "Edit",
                              icon: <EditIcon />,
                              onClick: () => openEdit(service),
                            },
                            {
                              label: "Delete",
                              icon: <DeleteIcon />,
                              onClick: () => setDeleteId(service.id),
                              danger: true,
                            },
                          ]}
                        />
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <div className="px-5 pb-4">
              <Pagination
                page={page}
                total={total}
                perPage={PER_PAGE}
                onChange={setPage}
              />
            </div>
          </>
        )}
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editId ? "Edit Service" : "Add Service"}
        width="max-w-xl"
      >
        <div className="space-y-4">
          <SectionCard title="Service Information">
            <div className="space-y-3">
              <Input
                label="Service Name (English)"
                value={form.nameEn}
                onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
                placeholder="e.g. Steel Fabrication"
              />
              <Input
                label="Service Name (Arabic)"
                value={form.nameAr}
                onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))}
                placeholder="مثلاً: تصنيع الفولاذ"
                dir="rtl"
                className="text-right"
              />
              <Textarea
                label="Service Description (English)"
                value={form.descriptionEn}
                onChange={(e) => setForm((f) => ({ ...f, descriptionEn: e.target.value }))}
                placeholder="Service description in English…"
              />
              <Textarea
                label="Service Description (Arabic)"
                value={form.descriptionAr}
                onChange={(e) => setForm((f) => ({ ...f, descriptionAr: e.target.value }))}
                placeholder="وصف الخدمة بالعربية…"
                dir="rtl"
                className="text-right"
              />
              <Input
                label="Display Order"
                type="number"
                value={form.order}
                onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
                min="1"
                className="w-24"
              />
            </div>
          </SectionCard>

          <SectionCard title="Service Image">
            <ImageUploader
              onUpload={handleImageUpload}
              preview={preview}
              onRemove={handleDeleteImage}
            />
            <div className="mt-3">
              <Switch
                checked={form.active}
                onChange={(v) => setForm((f) => ({ ...f, active: v }))}
                label="Active"
              />
            </div>
          </SectionCard>
        </div>

        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-[var(--border)]">
          <Button variant="ghost" onClick={() => setFormOpen(false)}>
            Cancel
          </Button>
          <Button variant="accent" onClick={handleSave} loading={saving}>
            Save Service
          </Button>
        </div>
      </Modal>

      <ConfirmModal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Service?"
        message="Are you sure you want to delete this service?"
      />
    </div>
  )
}
