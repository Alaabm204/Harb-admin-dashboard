import React, { useEffect, useRef, useState } from "react"
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
  Select,
  ImageUploader,
  Switch,
  StatusBadge,
  ActionsDropdown,
  EditIcon,
  DeleteIcon,
} from "@/components/ui"
import { getCategories, type Category } from "@/lib/categories"
import {
  createProduct,
  deleteProduct,
  deleteProductImage,
  deleteProductPdf,
  getProducts,
  updateProduct,
  uploadProductImages,
  uploadProductPdf,
  getStoredProductImages,
  type Product,
  type ProductImage,
} from "@/lib/products"

import { formatApiError } from "@/lib/apiError"

interface FormData {
  nameEn: string
  nameAr: string
  categoryId: string
  available: boolean
  order: string
}

const emptyForm: FormData = {
  nameEn: "",
  nameAr: "",
  categoryId: "",
  available: true,
  order: "1",
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState("")
  const [catFilter, setCatFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [existingImages, setExistingImages] = useState<ProductImage[]>([])
  const [pendingUploads, setPendingUploads] = useState<Array<{ file: File; previewUrl: string }>>([])

  // Attached spec-sheet PDF state.
  const [pdfUrl, setPdfUrl] = useState("")
  const [originalPdfUrl, setOriginalPdfUrl] = useState("")
  const [pendingPdf, setPendingPdf] = useState<File | null>(null)
  const [removePdf, setRemovePdf] = useState(false)
  const pdfInputRef = useRef<HTMLInputElement | null>(null)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const PER_PAGE = 10

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const result = await getCategories({ page: 1, perPage: 100 })
        setCategories(result.items)
      } catch {
        setCategories([])
      }
    }

    void loadCategories()
  }, [])

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true)
      setError("")

      try {
        const result = await getProducts({
          search,
          categoryId: catFilter === "all" ? "" : catFilter,
          page,
          perPage: PER_PAGE,
        })
        setProducts(result.items)
        setTotal(result.total)
      } catch (err) {
        setError(formatApiError(err) || "Unable to load products.")
        setProducts([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    }

    void loadProducts()
  }, [search, catFilter, page])

  const refreshProducts = async (nextPage: number) => {
    const result = await getProducts({
      search,
      categoryId: catFilter === "all" ? "" : catFilter,
      page: nextPage,
      perPage: PER_PAGE,
    })
    setProducts(result.items)
    setTotal(result.total)
    setPage(nextPage)
  }

  const openAdd = () => {
    setForm(emptyForm)
    setEditId(null)
    setExistingImages([])
    setPendingUploads([])
    setPdfUrl("")
    setOriginalPdfUrl("")
    setPendingPdf(null)
    setRemovePdf(false)
    setFormOpen(true)
  }

  const openEdit = (p: Product) => {
    setForm({
      nameEn: p.nameEn,
      nameAr: p.nameAr,
      categoryId: p.categoryId,
      available: p.available,
      order: String(p.order),
    })
    setEditId(p.id)
    const storedImages = getStoredProductImages(p.id)
    const imageIdMap = new Map(storedImages.map((img) => [img.url, img.id]))
    const merged = p.images.map((img) => ({
      ...img,
      id: img.id ?? imageIdMap.get(img.url),
    }))
    setExistingImages(merged)
    setPendingUploads([])
    setPdfUrl(p.pdfUrl ?? "")
    setOriginalPdfUrl(p.pdfUrl ?? "")
    setPendingPdf(null)
    setRemovePdf(false)
    setFormOpen(true)
  }

  const handlePdfPick = (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    if (file.type && !/pdf/i.test(file.type) && !/\.pdf$/i.test(file.name)) {
      setError("Only PDF files are supported.")
      return
    }
    setError("")
    setPendingPdf(file)
    setRemovePdf(false)
    if (pdfInputRef.current) pdfInputRef.current.value = ""
  }

  const handleSave = async () => {
    if (!form.nameEn.trim() || !form.nameAr.trim()) return

    setSaving(true)
    setError("")

    try {
      if (editId) {
        await updateProduct(editId, {
          nameEn: form.nameEn.trim(),
          nameAr: form.nameAr.trim(),
          categoryId: form.categoryId,
          available: form.available,
          order: Number(form.order) || 0,
        })

        if (pendingUploads.length) {
          await uploadProductImages(editId, pendingUploads.map((item) => item.file))
        }

        // PDF: replace with the newly picked file, or remove on request.
        if (pendingPdf) {
          await uploadProductPdf(editId, pendingPdf)
        } else if (removePdf && originalPdfUrl) {
          await deleteProductPdf(editId)
        }
      } else {
        const created = await createProduct({
          nameEn: form.nameEn.trim(),
          nameAr: form.nameAr.trim(),
          categoryId: form.categoryId,
          available: form.available,
          order: Number(form.order) || 0,
        })

        if (pendingUploads.length) {
          await uploadProductImages(created.id, pendingUploads.map((item) => item.file))
        }

        if (pendingPdf) {
          await uploadProductPdf(created.id, pendingPdf)
        }
      }

      setFormOpen(false)
      await refreshProducts(1)
    } catch (err) {
      setError(formatApiError(err) || "Unable to save product.")
    } finally {
      setSaving(false)

    }
  }

  const handleDelete = async () => {
    if (!deleteId) return

    setError("")
    try {
      await deleteProduct(deleteId)
      setDeleteId(null)
      await refreshProducts(page)
    } catch (err) {
      setError(formatApiError(err) || "Unable to delete product.")
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
          await deleteProductImage(editId, img.id)
          await refreshProducts(page)
        } catch (err) {
          setError(formatApiError(err) || "Unable to delete product image.")
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
        title="Products"
        breadcrumb="Admin / Products"
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
            Add Product
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <SearchBar
          value={search}
          onChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          placeholder="Search products…"
          className="w-64"
        />
        <div className="flex gap-1 flex-wrap">
          <button
            key="all"
            onClick={() => {
              setCatFilter("all")
              setPage(1)
            }}
            className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
              catFilter === "all"
                ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                : "bg-white text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--primary)]"
            }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => {
                setCatFilter(category.id)
                setPage(1)
              }}
              className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                catFilter === category.id
                  ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                  : "bg-white text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--primary)]"
              }`}
            >
              {category.nameEn}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded border border-[var(--error)]/30 bg-[var(--error-light)] p-3 text-sm text-[var(--error)]">
          {error}
        </div>
      )}

      <div className="bg-white border border-[var(--border)] rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-sm text-[var(--text-muted)]">Loading products…</div>
        ) : products.length === 0 ? (
          <EmptyState
            title="No products yet."
            desc="You haven't added any products."
            action={
              <Button variant="accent" onClick={openAdd}>
                Add Product
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Image</Th>
                  <Th>Product Name</Th>
                  <Th>Category</Th>
                  <Th>Availability</Th>
                  <Th>Order</Th>
                  <Th className="text-end">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <Tr key={p.id}>
                    <Td>
                      <div className="w-10 h-10 rounded bg-[var(--surface-secondary)] border border-[var(--border)] flex items-center justify-center overflow-hidden">
                        {p.imageUrls[0] ? (
                          <img src={p.imageUrls[0]} alt={p.nameEn} className="w-full h-full object-cover" />
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
                      <p className="font-medium text-[var(--text-primary)]">{p.nameEn}</p>
                      <p className="text-xs text-[var(--text-muted)]" dir="rtl">{p.nameAr}</p>
                    </Td>
                     <Td>
                       <span className="text-[var(--text-muted)] text-xs">{p.categoryName}</span>
                     </Td>
                     <Td>
                       <StatusBadge variant={p.available ? "active" : "inactive"} label={p.available ? "Available" : "Unavailable"} />
                     </Td>
                    <Td>
                      <span className="text-[var(--text-muted)] font-mono text-xs">{p.order}</span>
                    </Td>
                    <Td>
                      <div className="flex justify-end">
                        <ActionsDropdown
                          items={[
                            {
                              label: "Edit",
                              icon: <EditIcon />,
                              onClick: () => openEdit(p),
                            },
                            {
                              label: "Delete",
                              icon: <DeleteIcon />,
                              onClick: () => setDeleteId(p.id),
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
        title={editId ? "Edit Product" : "Add Product"}
        width="max-w-2xl"
      >
        <div className="space-y-4">
          <SectionCard title="Basic Information">
            <div className="space-y-3">
              <Input
                label="Product Name (English)"
                value={form.nameEn}
                onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
                placeholder="e.g. Steel I-Beam"
              />
              <Input
                label="Product Name (Arabic)"
                value={form.nameAr}
                onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))}
                placeholder="مثلاً: عارضة فولاذية"
                dir="rtl"
                className="text-right"
              />
            </div>
          </SectionCard>

          <SectionCard title="Category & Status">
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Category"
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                options={[
                  { value: "", label: "Select category" },
                  ...categories.map((category) => ({
                    value: category.id,
                    label: category.nameEn,
                  })),
                ]}
              />
              <Input
                label="Display Order"
                type="number"
                value={form.order}
                onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
                min="1"
              />
            </div>
            <div className="mt-3">
              <Switch
                checked={form.available}
                onChange={(v) => setForm((f) => ({ ...f, available: v }))}
                label="Available for Display"
              />
            </div>
          </SectionCard>

          <SectionCard title="Media">
            <ImageUploader
              label="Product Images"
              onUpload={(files) => {
                if (!files.length) return
                setPendingUploads((current) => [
                  ...current,
                  ...files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
                ])
              }}
              preview={imagePreviews}
              onRemove={handleRemoveImage}
              multiple
            />
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Images must be between 200×200 and 4000×4000 pixels. Up to 10 files per upload. A product must keep at least one image.
            </p>
          </SectionCard>

          <SectionCard title="Product File (PDF)">
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => handlePdfPick(e.target.files)}
            />
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                {pendingPdf ? (
                  <>
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{pendingPdf.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">Will be uploaded when you save</p>
                  </>
                ) : removePdf ? (
                  <>
                    <p className="text-sm text-[var(--error)]">Current file will be removed when you save.</p>
                    <button
                      type="button"
                      className="text-xs text-[var(--primary)] hover:underline mt-0.5"
                      onClick={() => {
                        setRemovePdf(false)
                        setPdfUrl(originalPdfUrl)
                      }}
                    >
                      Undo
                    </button>
                  </>
                ) : pdfUrl ? (
                  <>
                    <a href={pdfUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-[var(--primary)] hover:underline">
                      View current file
                    </a>
                    <p className="text-xs text-[var(--text-muted)]">A new upload replaces this file</p>
                  </>
                ) : (
                  <p className="text-sm text-[var(--text-secondary)]">No product file attached</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {pdfUrl && !pendingPdf && !removePdf && (
                  <Button variant="ghost" size="sm" onClick={() => setRemovePdf(true)}>
                    Remove
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => pdfInputRef.current?.click()}>
                  {pendingPdf ? "Change" : pdfUrl ? "Replace" : "Choose File"}
                </Button>
              </div>
            </div>
          </SectionCard>

        </div>

        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-[var(--border)]">
          <Button variant="ghost" onClick={() => setFormOpen(false)}>
            Cancel
          </Button>
          <Button variant="accent" onClick={handleSave} loading={saving}>
            Save Product
          </Button>
        </div>
      </Modal>

      <ConfirmModal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Product?"
        message="Are you sure you want to delete this product?"
      />
    </div>
  )
}