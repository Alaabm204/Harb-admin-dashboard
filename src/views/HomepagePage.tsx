import React, { useEffect, useState } from "react"
import {
  Button,
  PageHeader,
  SectionCard,
  Input,
  Textarea,
  ImageUploader,
  Switch,
} from "@/components/ui"
import {
  getFeaturedSelections,
  getHomepage,
  updateHeroSection,
  uploadHeroImage,
  deleteHeroImage,
  setFeaturedProducts,
  setFeaturedProjects,
  type HomepageContent,
} from "@/lib/homepage"
import { getProducts, type Product } from "@/lib/products"
import { getProjects, type Project } from "@/lib/projects"
import { formatApiError } from "@/lib/apiError"

// The API does not return the currently featured products/projects (verified
// live: GET /admin/homepage has no such keys), so the selection lives in
// localStorage and stays the visible source of truth until a new one is saved.
const FEATURED_PRODUCTS_KEY = "homepage-featured-products"
const FEATURED_PROJECTS_KEY = "homepage-featured-projects"

const readCachedIds = (key: string): string[] => {
  try {
    const raw = localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

const writeCachedIds = (key: string, ids: string[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(ids))
  } catch {
    // Best-effort cache; ignore quota/serialization failures.
  }
}

export default function HomepagePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)
  const [heroTitleEn, setHeroTitleEn] = useState("")
  const [heroTitleAr, setHeroTitleAr] = useState("")
  const [heroSubEn, setHeroSubEn] = useState("")
  const [heroSubAr, setHeroSubAr] = useState("")
  const [heroImage, setHeroImage] = useState("")
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null)
  // Hydrate synchronously from the local cache so a previous choice is always
  // visible immediately and can never be wiped by an async refetch.
  const [featuredProducts, setFeaturedProductsState] = useState<string[]>(() => readCachedIds(FEATURED_PRODUCTS_KEY))
  const [featuredProjects, setFeaturedProjectsState] = useState<string[]>(() => readCachedIds(FEATURED_PROJECTS_KEY))
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [loadingLists, setLoadingLists] = useState(true)

  useEffect(() => {
    const loadHomepage = async () => {
      try {
        setLoading(true)
        setError("")
        const data: HomepageContent = await getHomepage()
        setHeroTitleEn(data.hero.titleEn)
        setHeroTitleAr(data.hero.titleAr)
        setHeroSubEn(data.hero.subtitleEn)
        setHeroSubAr(data.hero.subtitleAr)
        setHeroImage(data.hero.imageUrl)

        // The saved selections live on the SERVER (public GET /homepage) so all
        // devices see the same choice. Server wins whenever it responds; the
        // localStorage cache is only a fallback for offline/error cases.
        try {
          const selections = await getFeaturedSelections()
          if (selections.products.length || selections.projects.length) {
            setFeaturedProductsState(selections.products)
            setFeaturedProjectsState(selections.projects)
            writeCachedIds(FEATURED_PRODUCTS_KEY, selections.products)
            writeCachedIds(FEATURED_PROJECTS_KEY, selections.projects)
          } else {
            // Server responded with nothing saved — show that truth instead of
            // a stale local cache, EXCEPT keep ids whose products/projects no
            // longer exist anywhere (nothing to show for them anyway).
            setFeaturedProductsState([])
            setFeaturedProjectsState([])
            writeCachedIds(FEATURED_PRODUCTS_KEY, [])
            writeCachedIds(FEATURED_PROJECTS_KEY, [])
          }
        } catch {
          // Selection read failed (e.g. network) — keep the cached hydration.
        }
      } catch (err) {
        setError(formatApiError(err) || "Unable to load homepage content.")
      } finally {
        setLoading(false)
      }
    }

    const loadLists = async () => {
      try {
        setLoadingLists(true)
        const [products, projects] = await Promise.all([
          getProducts({ page: 1, perPage: 100 }),
          getProjects({ page: 1, perPage: 100 }),
        ])
        setAllProducts(products.items)
        setAllProjects(projects.items)
      } catch {
        setAllProducts([])
        setAllProjects([])
      } finally {
        setLoadingLists(false)
      }
    }

    void loadHomepage()
    void loadLists()
  }, [])

  const toggleProduct = (id: string) =>
    setFeaturedProductsState((ps) => {
      const next = ps.includes(id) ? ps.filter((p) => p !== id) : [...ps, id]
      // Persist immediately so the choice survives reloads even before saving.
      writeCachedIds(FEATURED_PRODUCTS_KEY, next)
      return next
    })
  const toggleProject = (id: string) =>
    setFeaturedProjectsState((ps) => {
      const next = ps.includes(id) ? ps.filter((p) => p !== id) : [...ps, id]
      writeCachedIds(FEATURED_PROJECTS_KEY, next)
      return next
    })

  const handleSave = async () => {
    // The backend requires at least one item per list — validate up front so
    // the user's on-screen selection is never silently rejected or reset.
    if (!featuredProducts.length) {
      setError("At least one featured product must be selected.")
      return
    }
    if (!featuredProjects.length) {
      setError("At least one featured project must be selected.")
      return
    }

    setSaving(true)
    setError("")
    setSaved(false)
    try {
      await updateHeroSection({
        titleEn: heroTitleEn,
        titleAr: heroTitleAr,
        subtitleEn: heroSubEn,
        subtitleAr: heroSubAr,
      })

      if (heroImageFile) {
        const uploadedUrl = await uploadHeroImage(heroImageFile)
        setHeroImage(uploadedUrl)
        setHeroImageFile(null)
      }

      await setFeaturedProducts(featuredProducts)
      await setFeaturedProjects(featuredProjects)

      // Only after BOTH saves succeeded does the cached selection become the
      // new "last saved choice" (it already matches what's on screen).
      writeCachedIds(FEATURED_PRODUCTS_KEY, featuredProducts)
      writeCachedIds(FEATURED_PROJECTS_KEY, featuredProjects)

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(formatApiError(err) || "Unable to save homepage changes.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Homepage"
        breadcrumb="Admin / Homepage"
        action={
          <div className="flex items-center gap-3">
            {saved && (
              <span className="text-xs text-[var(--success)] font-medium flex items-center gap-1">
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Changes saved successfully.
              </span>
            )}
            <Button variant="accent" onClick={handleSave} loading={saving} disabled={loading}>
              Save Changes
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mb-4 rounded border border-[var(--error)]/30 bg-[var(--error-light)] p-3 text-sm text-[var(--error)]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded bg-white border border-[var(--border)] p-6 text-sm text-[var(--text-muted)]">
          Loading homepage content…
        </div>
      ) : (
        <div className="space-y-5">
          {/* Hero text */}
          <SectionCard title="Hero Section">
            <div className="space-y-3">
              <Input
                label="Hero Title (English)"
                value={heroTitleEn}
                onChange={(e) => setHeroTitleEn(e.target.value)}
                placeholder="Enter English hero title"
              />
              <Input
                label="Hero Title (Arabic)"
                value={heroTitleAr}
                onChange={(e) => setHeroTitleAr(e.target.value)}
                placeholder="أدخل عنوان الهيرو بالعربية"
                dir="rtl"
                className="text-right"
              />
              <Textarea
                label="Hero Subtitle (English)"
                value={heroSubEn}
                onChange={(e) => setHeroSubEn(e.target.value)}
                placeholder="Enter English hero subtitle"
                className="min-h-[70px]"
              />
              <Textarea
                label="Hero Subtitle (Arabic)"
                value={heroSubAr}
                onChange={(e) => setHeroSubAr(e.target.value)}
                placeholder="أدخل العنوان الفرعي بالعربية"
                dir="rtl"
                className="text-right min-h-[70px]"
              />
            </div>
          </SectionCard>

          {/* Hero image */}
          <SectionCard title="Hero Image">
            <ImageUploader
              onUpload={(files) => {
                const file = files[0]
                if (!file) return
                setHeroImageFile(file)
                const reader = new FileReader()
                reader.onload = () => setHeroImage(String(reader.result))
                reader.readAsDataURL(file)
              }}
              preview={heroImage}
              onRemove={async () => {
                setHeroImage("")
                setHeroImageFile(null)
                if (heroImage) {
                  await deleteHeroImage().catch(() => undefined)
                }
              }}
            />
          </SectionCard>

          {/* Featured Products */}
          <SectionCard title="Featured Products">
            <p className="text-xs text-[var(--text-muted)] mb-4">
              Select products to feature on the homepage. Your choice is saved to the server and shown on every device. At least one product must stay selected.
            </p>
            {loadingLists ? (
              <div className="text-sm text-[var(--text-muted)]">Loading products…</div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {allProducts.map((p) => {
                    const selected = featuredProducts.includes(p.id)
                    return (
                      <button
                        key={p.id}
                        onClick={() => toggleProduct(p.id)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded border text-sm text-start transition-colors ${
                          selected
                            ? "border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]"
                            : "border-[var(--border)] bg-white text-[var(--text-secondary)] hover:border-[var(--primary)]"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                            selected
                              ? "bg-[var(--primary)] border-[var(--primary)]"
                              : "border-[var(--border)]"
                          }`}
                        >
                          {selected && (
                            <svg
                              viewBox="0 0 24 24"
                              className="w-3 h-3 text-white"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        <span className="truncate">{p.nameEn}</span>
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  {featuredProducts.length} selected
                </p>
              </>
            )}
          </SectionCard>

          {/* Featured Projects */}
          <SectionCard title="Featured Projects">
            <p className="text-xs text-[var(--text-muted)] mb-4">
              Select projects to feature on the homepage. Your choice is saved to the server and shown on every device. At least one project must stay selected.
            </p>
            {loadingLists ? (
              <div className="text-sm text-[var(--text-muted)]">Loading projects…</div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {allProjects.map((p) => {
                    const selected = featuredProjects.includes(p.id)
                    return (
                      <button
                        key={p.id}
                        onClick={() => toggleProject(p.id)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded border text-sm text-start transition-colors ${
                          selected
                            ? "border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]"
                            : "border-[var(--border)] bg-white text-[var(--text-secondary)] hover:border-[var(--primary)]"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                            selected
                              ? "bg-[var(--primary)] border-[var(--primary)]"
                              : "border-[var(--border)]"
                          }`}
                        >
                          {selected && (
                            <svg
                              viewBox="0 0 24 24"
                              className="w-3 h-3 text-white"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        <span className="truncate">{p.nameEn}</span>
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  {featuredProjects.length} selected
                </p>
              </>
            )}
          </SectionCard>
        </div>
      )}
    </div>
  )
}
