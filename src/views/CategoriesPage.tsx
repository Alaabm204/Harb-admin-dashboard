import React, { useEffect, useState } from "react"
import {
  Button,
  SearchBar,
  Table,
  Th,
  Td,
  Tr,
  Pagination,
  Modal,
  ConfirmModal,
  EmptyState,
  PageHeader,
  Input,
  ActionsDropdown,
  EditIcon,
  DeleteIcon,
} from "@/components/ui"
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
  type Category,
} from "@/lib/categories"
import { formatApiError } from "@/lib/apiError"

export default function CategoriesPage() {
  const [cats, setCats] = useState<Category[]>([])
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({ nameEn: "", nameAr: "" })

  const PER_PAGE = 10

  useEffect(() => {
    const loadCategories = async () => {
      setLoading(true)
      setError("")

      try {
        const result = await getCategories({ search, page, perPage: PER_PAGE })
        setCats(result.items)
        setTotal(result.total)
      } catch (err) {
        const message = formatApiError(err)
        if (!message) {
          setCats([])
          setTotal(0)
        } else {
          setError(message)
          setCats([])
          setTotal(0)
        }
      } finally {
        setLoading(false)
      }
    }

    void loadCategories()
  }, [search, page])

  const openAdd = () => {
    setForm({ nameEn: "", nameAr: "" })
    setEditId(null)
    setFormOpen(true)
  }

  const openEdit = (c: Category) => {
    setForm({ nameEn: c.nameEn, nameAr: c.nameAr })
    setEditId(c.id)
    setFormOpen(true)
  }

  const handleSave = async () => {
    if (!form.nameEn.trim() || !form.nameAr.trim()) return

    setSaving(true)
    setError("")

    try {
      if (editId) {
        await updateCategory(editId, form.nameEn.trim(), form.nameAr.trim())
      } else {
        await createCategory(form.nameEn.trim(), form.nameAr.trim())
      }
      setFormOpen(false)
      setPage(1)
      const result = await getCategories({ search, page: 1, perPage: PER_PAGE })
      setCats(result.items)
      setTotal(result.total)
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
      await deleteCategory(deleteId)
      setDeleteId(null)
      const result = await getCategories({ search, page, perPage: PER_PAGE })
      setCats(result.items)
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

  return (
    <div>
      <PageHeader
        title="Categories"
        breadcrumb="Admin / Categories"
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
            Add Category
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
          placeholder="Search categories…"
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
          <div className="p-8 text-sm text-[var(--text-muted)]">Loading categories…</div>
        ) : cats.length === 0 ? (
          <EmptyState
            title="No categories yet."
            desc="You haven't added any categories."
            action={
              <Button variant="accent" onClick={openAdd}>
                Add Category
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Category Name</Th>
                  <Th>Products</Th>
                  <Th className="text-end">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {cats.map((c) => (
                  <Tr key={c.id}>
                    <Td>
                      <p className="font-medium text-[var(--text-primary)]">
                        {c.nameEn}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]" dir="rtl">
                        {c.nameAr}
                      </p>
                    </Td>
                    <Td>
                      <span className="text-[var(--text-muted)] text-sm">
                        {c.count}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex justify-end">
                        <ActionsDropdown
                          items={[
                            {
                              label: "Edit",
                              icon: <EditIcon />,
                              onClick: () => openEdit(c),
                            },
                            {
                              label: "Delete",
                              icon: <DeleteIcon />,
                              onClick: () => setDeleteId(c.id),
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
        title={editId ? "Edit Category" : "Add Category"}
        width="max-w-sm"
      >
        <div className="space-y-3">
          <Input
            label="Category Name (English)"
            value={form.nameEn}
            onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
            placeholder="e.g. Structural Steel"
          />
          <Input
            label="Category Name (Arabic)"
            value={form.nameAr}
            onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))}
            placeholder="مثلاً: الفولاذ الإنشائي"
            dir="rtl"
            className="text-right"
          />
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="ghost" onClick={() => setFormOpen(false)}>
            Cancel
          </Button>
          <Button variant="accent" onClick={handleSave} loading={saving}>
            Save
          </Button>
        </div>
      </Modal>

      <ConfirmModal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Category?"
        message="Are you sure you want to delete this category?"
      />
    </div>
  )
}
