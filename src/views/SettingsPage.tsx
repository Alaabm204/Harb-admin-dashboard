import React, { useEffect, useRef, useState } from "react"
import { Button, PageHeader, SectionCard, Input, Textarea, ImageUploader, Tabs } from "@/components/ui"
import { getCompanyInfo, updateCompanyInfo, uploadCompanyLogo, deleteCompanyLogo, type CompanyPhone } from "@/lib/companyInfo"
import { formatApiError } from "@/lib/apiError"

const empty = {
  nameEn: "",
  nameAr: "",
  descriptionEn: "",
  descriptionAr: "",
  address: "",
  email: "",
  phoneNumbers: [
    { number: "", label: "" },
    { number: "", label: "" },
  ] as CompanyPhone[],
  googleMapsUrl: "",
  workingHours: "",
  socialMediaLinks: {
    facebook: "",
    linkedin: "",
  },
}

export default function SettingsPage() {
  const [tab, setTab] = useState("info")
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [logoPreview, setLogoPreview] = useState("/logo.png")
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [company, setCompany] = useState(empty)

  useEffect(() => {
    const loadCompanyInfo = async () => {
      try {
        setLoading(true)
        const next = await getCompanyInfo()
        // The API stores a list of labeled phone numbers; the UI edits the
        // first two entries.
        const phones = [...next.phoneNumbers]
        while (phones.length < 2) phones.push({ number: "", label: "" })
        setCompany({
          nameEn: next.nameEn,
          nameAr: next.nameAr,
          descriptionEn: next.descriptionEn,
          descriptionAr: next.descriptionAr,
          address: next.address,
          email: next.email,
          phoneNumbers: phones.slice(0, 2),
          googleMapsUrl: next.googleMapsUrl,
          workingHours: next.workingHours,
          socialMediaLinks: {
            facebook: next.socialMediaLinks.facebook,
            linkedin: next.socialMediaLinks.linkedin,
          },
        })
        setLogoPreview(next.logoUrl || "/logo.png")
        setError("")
      } catch (err) {
        setError(formatApiError(err) || "Unable to load company settings.")
      } finally {
        setLoading(false)
      }
    }

    void loadCompanyInfo()
  }, [])

  const tabs = [
    { key: "info", label: "Company Information" },
    { key: "contact", label: "Contact Information" },
    { key: "hours", label: "Working Hours" },
    { key: "social", label: "Social Media" },
  ]

  // ── Swipeable slides ────────────────────────────────────────────────────────
  // On mobile the tab bar scrolls horizontally and the content panes behave as
  // slides: a horizontal swipe moves to the previous/next section.
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const [slideDir, setSlideDir] = useState<"left" | "right">("right")
  const tabIndex = Math.max(0, tabs.findIndex((t) => t.key === tab))

  const goToTab = (index: number) => {
    if (index < 0 || index >= tabs.length || index === tabIndex) return
    setSlideDir(index > tabIndex ? "right" : "left")
    setTab(tabs[index].key)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touchStart.current.x
    const dy = t.clientY - touchStart.current.y
    touchStart.current = null
    // Horizontal swipes switch slides. The generous vertical ratio guard keeps
    // normal page scrolling and text-area touches working as expected.
    if (Math.abs(dx) >= 56 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      goToTab(tabIndex + (dx < 0 ? 1 : -1))
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError("")
    try {
      await updateCompanyInfo({
        ...company,
        phoneNumbers: company.phoneNumbers.filter((phone) => phone.number.trim()),
      })
      if (logoFile) {
        const uploadedLogo = await uploadCompanyLogo(logoFile)
        setLogoPreview(uploadedLogo || "/logo.png")
        setLogoFile(null)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(formatApiError(err) || "Unable to save company settings.")
    } finally {
      setSaving(false)
    }
  }

  const setPhone = (index: number, field: keyof CompanyPhone, value: string) => {
    setCompany((current) => ({
      ...current,
      phoneNumbers: current.phoneNumbers.map((phone, i) =>
        i === index ? { ...phone, [field]: value } : phone,
      ),
    }))
  }

  return (
    <div>
      <PageHeader
        title="Company Settings"
        breadcrumb="Admin / Company Settings"
        action={
          <div className="flex items-center gap-3">
            {saved && (
              <span className="text-xs text-[var(--success)] font-medium flex items-center gap-1">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Settings saved successfully.
              </span>
            )}
            <Button variant="accent" onClick={() => void handleSave()} loading={saving}>
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
        <div className="rounded bg-white border border-[var(--border)] p-6 text-sm text-[var(--text-muted)]">Loading company settings…</div>
      ) : (
        <>
          <Tabs tabs={tabs} active={tab} onChange={setTab} className="mb-3 bg-white border border-[var(--border)] rounded-t-lg px-2" />
          <p className="sm:hidden text-xs text-[var(--text-muted)] mb-3">Swipe left or right to switch sections.</p>

          {/* Swipeable slide container — keyed remount drives the slide animation */}
          <div
            key={tab}
            className={slideDir === "right" ? "slide-in-right" : "slide-in-left"}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
          {tab === "info" && (
            <div className="space-y-4">
              <SectionCard>
                <div className="space-y-3">
                  <Input label="Company Name (English)" value={company.nameEn} onChange={(e) => setCompany((c) => ({ ...c, nameEn: e.target.value }))} />
                  <Input label="Company Name (Arabic)" value={company.nameAr} onChange={(e) => setCompany((c) => ({ ...c, nameAr: e.target.value }))} dir="rtl" className="text-right" />
                  <Textarea label="Company Description (English)" value={company.descriptionEn} onChange={(e) => setCompany((c) => ({ ...c, descriptionEn: e.target.value }))} />
                  <Textarea label="Company Description (Arabic)" value={company.descriptionAr} onChange={(e) => setCompany((c) => ({ ...c, descriptionAr: e.target.value }))} dir="rtl" className="text-right" />
                </div>
              </SectionCard>
              <SectionCard title="Company Logo">
                <ImageUploader
                  onUpload={(files) => {
                    const file = files[0]
                    if (!file) return
                    setLogoFile(file)
                    const reader = new FileReader()
                    reader.onload = () => setLogoPreview(String(reader.result))
                    reader.readAsDataURL(file)
                  }}
                  preview={logoPreview}
                  onRemove={() => {
                    setLogoPreview("/logo.png")
                    setLogoFile(null)
                    void deleteCompanyLogo().catch(() => undefined)
                  }}
                />
                <p className="text-xs text-[var(--text-muted)] mt-2">Current logo is the official HARB Group logo.</p>
              </SectionCard>
            </div>
          )}

          {tab === "contact" && (
            <SectionCard>
              <div className="space-y-3">
                <Textarea label="Address" value={company.address} onChange={(e) => setCompany((c) => ({ ...c, address: e.target.value }))} className="min-h-[60px]" />
                <Input label="Email" type="email" value={company.email} onChange={(e) => setCompany((c) => ({ ...c, email: e.target.value }))} />
                {company.phoneNumbers.map((phone, index) => (
                  <div key={index} className="grid grid-cols-[1fr_2fr] gap-3 items-end">
                    <Input
                      label={`Phone ${index + 1} Label`}
                      value={phone.label}
                      onChange={(e) => setPhone(index, "label", e.target.value)}
                      placeholder="e.g. admin / sales"
                    />
                    <Input
                      label={`Phone Number ${index + 1}`}
                      value={phone.number}
                      onChange={(e) => setPhone(index, "number", e.target.value)}
                      placeholder="+971 …"
                    />
                  </div>
                ))}
                <Input label="Google Maps URL" value={company.googleMapsUrl} onChange={(e) => setCompany((c) => ({ ...c, googleMapsUrl: e.target.value }))} placeholder="https://maps.google.com/…" />
              </div>
            </SectionCard>
          )}

          {tab === "hours" && (
            <SectionCard title="Working Hours">
              <Textarea value={company.workingHours} onChange={(e) => setCompany((c) => ({ ...c, workingHours: e.target.value }))} className="min-h-[80px]" />
              <p className="text-xs text-[var(--text-muted)] mt-2">e.g. Sun–Thu: 8:00 AM – 6:00 PM, Fri–Sat: Closed</p>
            </SectionCard>
          )}

          {tab === "social" && (
            <SectionCard title="Social Media">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-[var(--surface-secondary)] border border-[var(--border)] flex items-center justify-center text-xs font-bold text-[var(--text-muted)] flex-shrink-0">
                    in
                  </div>
                  <Input
                    label="LinkedIn"
                    placeholder="https://linkedin.com/company/…"
                    value={company.socialMediaLinks.linkedin}
                    onChange={(e) => setCompany((c) => ({ ...c, socialMediaLinks: { ...c.socialMediaLinks, linkedin: e.target.value } }))}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-[var(--surface-secondary)] border border-[var(--border)] flex items-center justify-center text-xs font-bold text-[var(--text-muted)] flex-shrink-0">
                    f
                  </div>
                  <Input
                    label="Facebook"
                    placeholder="https://facebook.com/…"
                    value={company.socialMediaLinks.facebook}
                    onChange={(e) => setCompany((c) => ({ ...c, socialMediaLinks: { ...c.socialMediaLinks, facebook: e.target.value } }))}
                  />
                </div>
                <p className="text-xs text-[var(--text-muted)]">Only LinkedIn and Facebook are supported by the API.</p>
              </div>
            </SectionCard>
          )}
          </div>
        </>
      )}
    </div>
  )
}