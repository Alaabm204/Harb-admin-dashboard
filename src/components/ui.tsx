import React, { useState, useRef, useEffect } from "react"

// ─── Types ───────────────────────────────────────────────────────────────────
export type Lang = "en" | "ar"

// ─── Button ──────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "accent" | "ghost" | "danger" | "outline"
  size?: "sm" | "md" | "lg"
  loading?: boolean
  icon?: React.ReactNode
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  icon,
  children,
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium rounded cursor-pointer border border-transparent select-none disabled:opacity-50 disabled:cursor-not-allowed"
  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-9 px-4 text-sm",
    lg: "h-10 px-5 text-sm",
  }
  const variants = {
    primary:
      "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)]",
    accent: "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]",
    ghost:
      "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] border-[var(--border)]",
    danger: "bg-[var(--error)] text-white hover:opacity-90",
    outline:
      "bg-white text-[var(--primary)] border-[var(--primary)] hover:bg-[var(--primary-light)]",
  }
  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : icon}
      {children}
    </button>
  )
}

// ─── IconButton ───────────────────────────────────────────────────────────────
export function IconButton({
  children,
  className = "",
  title,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { title?: string }) {
  return (
    <button
      title={title}
      className={`inline-flex items-center justify-center w-8 h-8 rounded text-[var(--text-muted)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)] transition-colors ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

// ─── Input ────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
  suffix?: React.ReactNode
}

export function Input({
  label,
  error,
  icon,
  suffix,
  className = "",
  ...props
}: InputProps) {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label className="text-xs font-medium text-[var(--text-secondary)]">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <span className="absolute start-3 text-[var(--text-muted)]">
            {icon}
          </span>
        )}
        <input
          className={`w-full h-9 px-3 ${icon ? "ps-9" : ""} ${
            suffix ? "pe-9" : ""
          } bg-white border border-[var(--border)] rounded text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-colors ${
            error ? "border-[var(--error)]" : ""
          } ${className}`}
          {...props}
        />
        {suffix && (
          <span className="absolute end-3 text-[var(--text-muted)]">
            {suffix}
          </span>
        )}
      </div>
      {error && <span className="text-xs text-[var(--error)]">{error}</span>}
    </div>
  )
}

// ─── Textarea ─────────────────────────────────────────────────────────────────
interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({
  label,
  error,
  className = "",
  ...props
}: TextareaProps) {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label className="text-xs font-medium text-[var(--text-secondary)]">
          {label}
        </label>
      )}
      <textarea
        className={`w-full px-3 py-2 bg-white border border-[var(--border)] rounded text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] resize-y min-h-[100px] ${
          error ? "border-[var(--error)]" : ""
        } ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-[var(--error)]">{error}</span>}
    </div>
  )
}

// ─── Select ───────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export function Select({
  label,
  error,
  options,
  className = "",
  ...props
}: SelectProps) {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label className="text-xs font-medium text-[var(--text-secondary)]">
          {label}
        </label>
      )}
      <select
        className={`w-full h-9 px-3 bg-white border border-[var(--border)] rounded text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] ${
          error ? "border-[var(--error)]" : ""
        } ${className}`}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-[var(--error)]">{error}</span>}
    </div>
  )
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────
type BadgeVariant = "active" | "inactive" | "unread" | "read" | "featured" | "default"

export function StatusBadge({
  variant = "default",
  label,
}: {
  variant?: BadgeVariant
  label: string
}) {
  const styles: Record<BadgeVariant, string> = {
    active: "bg-[var(--success-light)] text-[var(--success)]",
    inactive: "bg-[var(--surface-secondary)] text-[var(--text-muted)]",
    unread: "bg-[var(--primary-light)] text-[var(--primary)]",
    read: "bg-[var(--surface-secondary)] text-[var(--text-muted)]",
    featured: "bg-[var(--accent-light)] text-[var(--accent)]",
    default: "bg-[var(--surface-secondary)] text-[var(--text-secondary)]",
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[variant]}`}
    >
      {label}
    </span>
  )
}

// ─── Spinner ─────────────────────────────────────────────────────────────────
export function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = { sm: "w-3 h-3", md: "w-5 h-5", lg: "w-8 h-8" }
  return (
    <svg
      className={`animate-spin ${s[size]} text-current`}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`bg-white border border-[var(--border)] rounded-lg shadow-sm ${className}`}
    >
      {children}
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  width?: string
}

export function Modal({
  open,
  onClose,
  title,
  children,
  width = "max-w-lg",
}: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (open) document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className={`relative bg-white rounded-lg shadow-xl w-full ${width} max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            {title}
          </h3>
          <IconButton onClick={onClose}>
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </IconButton>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ─── ConfirmModal ─────────────────────────────────────────────────────────────
interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-sm">
      <p className="text-sm text-[var(--text-secondary)] mb-5">{message}</p>
      <p className="text-xs text-[var(--text-muted)] mb-5">
        This action cannot be undone.
      </p>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            onConfirm()
            onClose()
          }}
        >
          {confirmLabel || "Delete"}
        </Button>
      </div>
    </Modal>
  )
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
interface TabsProps {
  tabs: { key: string; label: string }[]
  active: string
  onChange: (key: string) => void
  className?: string
}

export function Tabs({ tabs, active, onChange, className = "" }: TabsProps) {
  return (
    <div className={`flex border-b border-[var(--border)] ${className}`}>
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
            active === t.key
              ? "border-[var(--primary)] text-[var(--primary)]"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ─── LangTabs ─────────────────────────────────────────────────────────────────
export function LangTabs({
  lang,
  onChange,
}: {
  lang: Lang
  onChange: (l: Lang) => void
}) {
  return (
    <Tabs
      tabs={[
        { key: "en", label: "English" },
        { key: "ar", label: "العربية" },
      ]}
      active={lang}
      onChange={(v) => onChange(v as Lang)}
      className="mb-4"
    />
  )
}

// ─── SearchBar ────────────────────────────────────────────────────────────────
export function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={`relative ${className}`}>
      <svg
        className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 ps-9 pe-3 bg-white border border-[var(--border)] rounded text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)]"
      />
    </div>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export function Pagination({
  page,
  total,
  perPage = 10,
  onChange,
}: {
  page: number
  total: number
  perPage?: number
  onChange: (p: number) => void
}) {
  const pages = Math.ceil(total / perPage)
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-between mt-4 text-sm text-[var(--text-muted)]">
      <span>{`${Math.min((page - 1) * perPage + 1, total)}–${Math.min(page * perPage, total)} of ${total}`}</span>
      <div className="flex gap-1">
        <IconButton
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="disabled:opacity-40"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </IconButton>
        {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
          const p = i + 1
          return (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`w-8 h-8 rounded text-xs font-medium ${
                p === page
                  ? "bg-[var(--primary)] text-white"
                  : "hover:bg-[var(--surface-secondary)]"
              }`}
            >
              {p}
            </button>
          )
        })}
        <IconButton
          onClick={() => onChange(page + 1)}
          disabled={page === pages}
          className="disabled:opacity-40"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </IconButton>
      </div>
    </div>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({
  title,
  desc,
  action,
}: {
  title: string
  desc?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-[var(--primary-light)] flex items-center justify-center mb-4">
        <svg
          className="w-6 h-6 text-[var(--primary)]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
        {title}
      </h3>
      {desc && (
        <p className="text-xs text-[var(--text-muted)] mb-4 max-w-xs">{desc}</p>
      )}
      {action}
    </div>
  )
}

// ─── LoadingState ─────────────────────────────────────────────────────────────
export function LoadingRows({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-10 bg-[var(--surface-secondary)] rounded animate-pulse"
          style={{ opacity: 1 - i * 0.15 }}
        />
      ))}
    </div>
  )
}

// ─── PageHeader ───────────────────────────────────────────────────────────────
export function PageHeader({
  title,
  breadcrumb,
  action,
}: {
  title: string
  breadcrumb?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        {breadcrumb && (
          <p className="text-xs text-[var(--text-muted)] mb-0.5">
            {breadcrumb}
          </p>
        )}
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          {title}
        </h1>
      </div>
      {action && <div className="flex gap-2">{action}</div>}
    </div>
  )
}

// ─── ImageUploader ────────────────────────────────────────────────────────────
export function ImageUploader({
  label,
  onUpload,
  preview,
  onRemove,
  multiple = false,
}: {
  label?: string
  onUpload?: (files: File[]) => void
  preview?: string | string[]
  onRemove?: (idx?: number) => void
  multiple?: boolean
}) {
  const previews = Array.isArray(preview) ? preview : preview ? [preview] : []
  const inputRef = React.useRef<HTMLInputElement>(null)
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-xs font-medium text-[var(--text-secondary)]">
          {label}
        </label>
      )}
      {previews.length > 0 && (
        <div className={`flex flex-wrap gap-2 mb-2`}>
          {previews.map((p, i) => (
            <div
              key={i}
              className="relative group w-20 h-20 rounded border border-[var(--border)] overflow-hidden bg-[var(--surface-secondary)]"
            >
              <img src={p} alt="" className="w-full h-full object-cover" />
              {onRemove && (
                <button
                  onClick={() => onRemove(i)}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? [])
          if (files.length) onUpload?.(files)
          event.target.value = ""
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex flex-col items-center justify-center gap-2 w-full h-24 border-2 border-dashed border-[var(--border)] rounded-lg hover:border-[var(--primary)] hover:bg-[var(--primary-light)] transition-colors cursor-pointer group"
      >
        <svg
          className="w-6 h-6 text-[var(--text-muted)] group-hover:text-[var(--primary)]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
        </svg>
        <span className="text-xs text-[var(--text-muted)] group-hover:text-[var(--primary)]">
          {previews.length && !multiple ? "Replace Image" : multiple ? "Upload Images" : "Upload Image"}
        </span>
      </button>
    </div>
  )
}

// ─── Switch ───────────────────────────────────────────────────────────────────
export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${
          checked ? "bg-[var(--primary)]" : "bg-[var(--disabled)]"
        }`}
      >
        <span
          className={`absolute top-0.5 start-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
      {label && (
        <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      )}
    </label>
  )
}

// ─── Table helpers ────────────────────────────────────────────────────────────
export function Table({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  )
}

export function Th({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <th
      className={`px-4 py-3 text-start text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide bg-[var(--surface-secondary)] border-b border-[var(--border)] whitespace-nowrap ${className}`}
    >
      {children}
    </th>
  )
}

export function Td({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <td
      className={`px-4 py-3 text-[var(--text-primary)] border-b border-[var(--divider)] ${className}`}
    >
      {children}
    </td>
  )
}

export function Tr({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <tr
      className={`hover:bg-[var(--surface-secondary)] transition-colors ${className}`}
    >
      {children}
    </tr>
  )
}

// ─── Dropdown ─────────────────────────────────────────────────────────────────
interface DropdownItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  danger?: boolean
}
export function ActionsDropdown({ items }: { items: DropdownItem[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])
  return (
    <div className="relative" ref={ref}>
      <IconButton onClick={() => setOpen((o) => !o)} title="Actions">
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </IconButton>
      {open && (
        <div className="absolute end-0 top-full mt-1 w-44 bg-white border border-[var(--border)] rounded-lg shadow-lg z-20 py-1">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => {
                item.onClick()
                setOpen(false)
              }}
              className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-start hover:bg-[var(--surface-secondary)] ${
                item.danger
                  ? "text-[var(--error)]"
                  : "text-[var(--text-primary)]"
              }`}
            >
              {item.icon && <span className="w-4">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── SectionCard ──────────────────────────────────────────────────────────────
export function SectionCard({
  title,
  children,
  className = "",
}: {
  title?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`bg-white border border-[var(--border)] rounded-lg ${className}`}
    >
      {title && (
        <div className="px-5 py-3 border-b border-[var(--border)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {title}
          </h3>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}

// ─── EditIcon / DeleteIcon / EyeIcon ─────────────────────────────────────────
export const EditIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
)
export const DeleteIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" />
  </svg>
)
export const EyeIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)
