import { createAdminRequest } from "@/lib/adminRequest"

export interface WeeklyVisitorDay {
  label: string
  value: number
}
export interface WeeklyVisitors {
  days: WeeklyVisitorDay[]
  total: number
}

const API_BASE = "/api/proxy/admin/analytics";

const adminRequest = createAdminRequest();

// Weekday labels used when the backend returns a bare array of numbers
// (e.g. [12, 30, …]) instead of named/labelled day objects.
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const toCount = (raw: unknown): number => {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
};

const toLabel = (raw: unknown, fallbackIndex: number): string => {
  const text = String(raw ?? "").trim();
  if (!text) return WEEKDAY_LABELS[fallbackIndex % WEEKDAY_LABELS.length];
  // ISO dates ("2026-09-28") read better on the chart as weekday names.
  if (/\d{4}-\d{2}-\d{2}/.test(text)) {
    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) return WEEKDAY_LABELS[parsed.getDay()];
  }
  return text;
};

// The analytics payload could not be inspected without an admin session, so —
// following the defensive-parsing convention of the other lib modules — every
// plausible variant of a weekly visitors response is accepted:
//   - data.weeklyVisitors / data.visitors / data.days / …  → array of day objects
//   - the bare array itself under data (or at the top level)
//   - day objects keyed as { day|date|label|_id, count|visitors|value|total|visits }
//   - a plain array of numbers, mapped to weekday labels by index
const parseDays = (response: any): any[] => {
  if (!response || typeof response !== "object") return [];
  const payload = response.data ?? response;
  if (Array.isArray(payload)) return payload;
  for (const key of ["weeklyVisitors", "visitors", "days", "dailyVisitors", "week", "results", "items"]) {
    const list = payload[key];
    if (Array.isArray(list)) return list;
  }
  return [];
};

const readDayObject = (item: any, index: number): WeeklyVisitorDay => {
  if (typeof item === "number") {
    return { label: WEEKDAY_LABELS[index % WEEKDAY_LABELS.length], value: toCount(item) };
  }
  const value = toCount(item?.count ?? item?.visitors ?? item?.value ?? item?.total ?? item?.visits);
  return { label: toLabel(item?.day ?? item?.date ?? item?.label ?? item?._id ?? item?.name, index), value };
};

// Prefer an explicit weekly total when the backend provides one; otherwise the
// chart total is simply the sum of the per-day values.
const readWeeklyTotal = (response: any, days: WeeklyVisitorDay[]): number => {
  const payload = response?.data ?? response ?? {};
  const raw =
    payload.totalVisitors ??
    payload.totalWeeklyVisitors ??
    (typeof payload.weeklyVisitors === "number" ? payload.weeklyVisitors : undefined) ??
    payload.total ??
    payload.count;
  const explicit = Number(raw);
  if (Number.isFinite(explicit) && explicit > 0) return Math.round(explicit);
  return days.reduce((sum, d) => sum + d.value, 0);
};

export async function getWeeklyVisitors(): Promise<WeeklyVisitors> {
  const response = await adminRequest<any>(`${API_BASE}/get-weekly-visitors`, { method: "GET" });
  const days = parseDays(response).map(readDayObject);
  return { days, total: readWeeklyTotal(response, days) };
}