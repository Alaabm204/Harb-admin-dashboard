import { createAdminRequest } from "@/lib/adminRequest"

export interface Client { id: string; name: string; logoUrl: string; active: boolean; }
export interface ClientListResult { items: Client[]; total: number; page: number; perPage: number; }

const API_BASE = "/api/proxy/admin/clients";

const adminRequest = createAdminRequest();

const readLogoUrl = (item: any): string => {
  const logo = item?.logo;
  if (typeof logo === "string") return logo;
  if (logo && typeof logo === "object") return String(logo.url ?? "");
  return String(item?.logoUrl ?? item?.imageUrl ?? "");
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

// Backend client shape:
// { _id, name, logo: { url }, isActive }
// Note: the API does not support a featured flag on clients — sending
// isFeatured is rejected with a validation error.
const normalizeClient = (item: any): Client => ({
  id: String(item?.id ?? item?._id ?? item?.clientId ?? ""),
  name: String(item?.name ?? item?.clientName ?? "Untitled Client"),
  logoUrl: readLogoUrl(item),
  active: normalizeBoolean(item?.isActive, true),
});

// Backend list responses look like:
// { success, message, data: { clients: [...], pagination: {...} } }
const parseList = (response: any): any[] => {
  if (!response || typeof response !== "object") return [];
  const payload = response.data ?? response;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.clients)) return payload.clients;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.results)) return payload.results;
  return [];
};

export async function getClients({ search = "", page = 1, perPage = 10 }: { search?: string; page?: number; perPage?: number } = {}): Promise<ClientListResult> {
  // The backend only accepts a `search` query parameter — page/limit are
  // rejected with a validation error, so paging is done client-side.
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());

  const url = `${API_BASE}${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await adminRequest<any>(url, { method: "GET" });
  const allItems = parseList(response).map(normalizeClient);
  const safePerPage = perPage > 0 ? perPage : allItems.length || 1;
  const start = (page - 1) * safePerPage;

  return {
    items: allItems.slice(start, start + safePerPage),
    total: allItems.length,
    page,
    perPage,
  };
}

export async function createClient(name: string, active?: boolean): Promise<Client> {
  const body: Record<string, unknown> = { name };
  if (active !== undefined) body.isActive = active;
  const response = await adminRequest<any>(API_BASE, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const item = response?.data ?? response;
  return normalizeClient(item);
}

export async function updateClient(id: string, name: string, active?: boolean): Promise<Client> {
  const body: Record<string, unknown> = { name };
  if (active !== undefined) body.isActive = active;
  const response = await adminRequest<any>(`${API_BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  // The update response may not echo the record; fall back to the payload.
  const fallback = { _id: id, name, ...(active !== undefined ? { isActive: active } : {}) };
  const item =
    response?.data && typeof response.data === "object" && response.data._id ? response.data : fallback;
  return normalizeClient(item);
}

export async function deleteClient(id: string): Promise<void> {
  await adminRequest<any>(`${API_BASE}/${id}`, { method: "DELETE" });
}

export async function uploadClientLogo(clientId: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append("logo", file);
  const response = await adminRequest<any>(`${API_BASE}/${clientId}/logo`, {
    method: "POST",
    body: formData,
  });
  const payload = response?.data ?? response ?? {};
  const logo = payload.logo;
  if (logo && typeof logo === "object") return String(logo.url ?? "");
  return String(payload.logoUrl ?? payload.url ?? "");
}

export async function deleteClientLogo(clientId: string): Promise<void> {
  await adminRequest<any>(`${API_BASE}/${clientId}/logo`, { method: "DELETE" });
}