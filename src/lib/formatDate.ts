// User-friendly date/time formatting for contact messages.
//
// IMPORTANT: formatting happens at DISPLAY TIME only. The raw ISO `date`
// string on ContactMessage must stay untouched because DashboardPage sorts
// messages with `new Date(date).getTime()` and the API never receives dates.

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const

const pad2 = (value: number): string => String(value).padStart(2, "0")

// Formats a date string as "05 Feb 2026, 10:30 AM" in the viewer's local
// timezone using a 12-hour clock. Manual formatting (instead of toLocale*)
// keeps the output identical in every browser/locale.
export function formatMessageDateTime(value: string): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const day = pad2(date.getDate())
  const month = MONTHS_SHORT[date.getMonth()]
  const year = date.getFullYear()

  const hours24 = date.getHours()
  const period = hours24 >= 12 ? "PM" : "AM"
  const hours12 = hours24 % 12 || 12 // 0 -> 12 AM, 12 -> 12 PM
  const minutes = pad2(date.getMinutes())

  return `${day} ${month} ${year}, ${hours12}:${minutes} ${period}`
}
