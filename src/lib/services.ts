import { createAdminRequest } from "@/lib/adminRequest";

export interface Service {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  // Maps to the backend's isActive flag.
  active: boolean;
  order: number;
  imageUrl: string;
}

export interface ServiceListResult {
  items: Service[];
  total: number;
  page: number;
  perPage: number;
}

const API_BASE = "/api/proxy/admin/services";

const adminRequest = createAdminRequest();

// The backend requires descriptionEn/descriptionAr on create/update but the
// list endpoint never returns them. To avoid wiping stored descriptions when
// editing, the last known values are cached locally per service id.
const DESC_CACHE_KEY = "service-description-cache";

type DescCache = Record<
  string,
  { descriptionEn: string; descriptionAr: string }
>;

const readDescCache = (): DescCache => {
  try {
    const raw = localStorage.getItem(DESC_CACHE_KEY);
    return raw ? (JSON.parse(raw) as DescCache) : {};
  } catch {
    return {};
  }
};

const writeDescCache = (cache: DescCache) => {
  try {
    localStorage.setItem(DESC_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage failures; the cache is best-effort.
  }
};

const rememberDescriptions = (
  id: string,
  descriptionEn: unknown,
  descriptionAr: unknown,
) => {
  if (!id) return;
  const cache = readDescCache();
  const existing = cache[id];
  const nextEn = typeof descriptionEn === "string" ? descriptionEn.trim() : "";
  const nextAr = typeof descriptionAr === "string" ? descriptionAr.trim() : "";
  // The backend requires non-empty descriptions on write and never returns
  // them on read, so an empty value here can only mean "unknown", not
  // "deliberately cleared". Keep the last known good value instead of wiping
  // the cache entry.
  cache[id] = {
    descriptionEn: nextEn || existing?.descriptionEn || "",
    descriptionAr: nextAr || existing?.descriptionAr || "",
  };
  writeDescCache(cache);
};

const normalizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";
const normalizeNumber = (value: unknown, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};
const normalizeBoolean = (value: unknown, fallback = true) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.toLowerCase();
    if (v === "true" || v === "1" || v === "yes") return true;
    if (v === "false" || v === "0" || v === "no") return false;
  }
  return fallback;
};

// Backend service shape:
// { _id, nameAr, nameEn, displayOrder, isActive, image: { url } }
const normalizeService = (item: any): Service => {
  const id = String(item?.id ?? item?._id ?? "");
  const image = item?.image;
  const imageUrl =
    image && typeof image === "object"
      ? String(image.url ?? "")
      : normalizeText(item?.imageUrl ?? item?.image);

  const cached = readDescCache()[id];

  return {
    id,
    nameEn: normalizeText(item?.nameEn ?? item?.name) || "Untitled",
    nameAr: normalizeText(item?.nameAr) || "بدون اسم",
    descriptionEn:
      normalizeText(item?.descriptionEn) || cached?.descriptionEn || "",
    descriptionAr:
      normalizeText(item?.descriptionAr) || cached?.descriptionAr || "",
    active: normalizeBoolean(item?.isActive, true),
    order: normalizeNumber(item?.displayOrder ?? item?.order),
    imageUrl,
  };
};

// Backend list responses look like:
// { success, message, data: { services: [...], pagination: {...} } }
const parseList = (response: any): any[] => {
  if (!response || typeof response !== "object") return [];
  const payload = response.data ?? response;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.services)) return payload.services;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.results)) return payload.results;
  return [];
};

export async function getServices({
  search = "",
  page = 1,
  perPage = 10,
}: {
  search?: string;
  page?: number;
  perPage?: number;
} = {}): Promise<ServiceListResult> {
  // The backend only accepts a `search` query parameter — page/limit are
  // rejected with a validation error, so paging is done client-side.
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());

  const url = `${API_BASE}${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await adminRequest<any>(url, { method: "GET" });
  const allItems = parseList(response).map(normalizeService);
  const safePerPage = perPage > 0 ? perPage : allItems.length || 1;
  const start = (page - 1) * safePerPage;

  return {
    items: allItems.slice(start, start + safePerPage),
    total: allItems.length,
    page,
    perPage,
  };
}

export async function createService(payload: {
  nameEn: string;
  nameAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  active?: boolean;
  order?: number;
}): Promise<Service> {
  const response = await adminRequest<any>(API_BASE, {
    method: "POST",
    body: JSON.stringify({
      nameEn: payload.nameEn,
      nameAr: payload.nameAr,
      descriptionEn: payload.descriptionEn ?? "",
      descriptionAr: payload.descriptionAr ?? "",
      isActive: payload.active ?? true,
      displayOrder: payload.order ?? 0,
    }),
  });
  const item = response?.data ?? response;
  const normalized = normalizeService(item);
  rememberDescriptions(normalized.id, item?.descriptionEn, item?.descriptionAr);
  return {
    ...normalized,
    descriptionEn: normalized.descriptionEn || (payload.descriptionEn ?? ""),
    descriptionAr: normalized.descriptionAr || (payload.descriptionAr ?? ""),
  };
}

export async function updateService(
  id: string,
  payload: Partial<Service>,
): Promise<Service> {
  const cached = readDescCache()[id] ?? {
    descriptionEn: "",
    descriptionAr: "",
  };
  const body: Record<string, unknown> = {};
  if (payload.nameEn !== undefined) body.nameEn = payload.nameEn;
  if (payload.nameAr !== undefined) body.nameAr = payload.nameAr;
  // Required by the backend — fall back to the last known values so an edit
  // that does not touch the descriptions cannot wipe them. A blank string is
  // treated as "unchanged" because the API rejects empty descriptions.
  const sentEn = payload.descriptionEn?.trim() ?? "";
  const sentAr = payload.descriptionAr?.trim() ?? "";
  body.descriptionEn = sentEn || cached.descriptionEn;
  body.descriptionAr = sentAr || cached.descriptionAr;
  if (payload.active !== undefined) body.isActive = payload.active;
  if (payload.order !== undefined) body.displayOrder = payload.order;

  const response = await adminRequest<any>(`${API_BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  const item =
    response?.data &&
    typeof response.data === "object" &&
    (response.data._id || response.data.service)
      ? (response.data.service ?? response.data)
      : { ...payload, _id: id };
  const normalized = normalizeService(item);
  // Cache what the server actually stored (it may normalise the text) and fall
  // back to what we sent.
  rememberDescriptions(
    id,
    item?.descriptionEn ?? body.descriptionEn,
    item?.descriptionAr ?? body.descriptionAr,
  );
  return {
    ...normalized,
    descriptionEn: normalized.descriptionEn || String(body.descriptionEn),
    descriptionAr: normalized.descriptionAr || String(body.descriptionAr),
  };
}

export async function deleteService(id: string): Promise<void> {
  await adminRequest<any>(`${API_BASE}/${id}`, { method: "DELETE" });
}

export async function uploadServiceImage(
  serviceId: string,
  file: File,
): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);
  const response = await adminRequest<any>(`${API_BASE}/${serviceId}/image`, {
    method: "POST",
    body: formData,
  });
  const payload = response?.data ?? response ?? {};
  const image = payload.image;
  if (image && typeof image === "object") return String(image.url ?? "");
  if (Array.isArray(payload) && payload[0]) return String(payload[0].url ?? "");
  return String(payload.imageUrl ?? payload.url ?? "");
}

export async function deleteServiceImage(serviceId: string): Promise<void> {
  await adminRequest<any>(`${API_BASE}/${serviceId}/image`, {
    method: "DELETE",
  });
}
