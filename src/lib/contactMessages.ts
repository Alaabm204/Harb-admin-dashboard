import { createAdminRequest } from "@/lib/adminRequest"

export interface ContactMessage {
  id: string;
  sender: string;
  email: string;
  phone?: string;
  subject?: string;
  body: string;
  date: string;
  read: boolean;
}
export interface ContactMessagesResult { items: ContactMessage[]; total: number; page: number; perPage: number; }

const API_BASE = "/api/proxy/admin/contact-messages";

const adminRequest = createAdminRequest();

// Backend message shape:
// { _id, name, email, phoneNumber, message, subject, isRead, readAt, createdAt }
const normalizeMessage = (item: any): ContactMessage => ({
  id: String(item?.id ?? item?._id ?? ""),
  sender: String(item?.sender ?? item?.name ?? "Unknown"),
  email: String(item?.email ?? ""),
  phone: String(item?.phoneNumber ?? item?.phone ?? ""),
  subject: String(item?.subject ?? ""),
  body: String(item?.message ?? item?.body ?? ""),
  date: String(item?.createdAt ?? item?.date ?? ""),
  read: Boolean(item?.isRead ?? item?.read ?? false),
});

// Backend list responses look like:
// { success, message, data: { messages: [...], pagination: { totalCount }, totlaUnReaded } }
const parseList = (response: any): any[] => {
  if (!response || typeof response !== "object") return [];
  const payload = response.data ?? response;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.messages)) return payload.messages;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.results)) return payload.results;
  return [];
};

const readTotal = (response: any, fallback = 0) => {
  if (!response || typeof response !== "object") return fallback;
  const payload = response.data ?? response;
  const total =
    payload.pagination?.totalCount ??
    payload.totalCount ??
    payload.total ??
    payload.count;
  return Number(total) || fallback;
};

export async function getContactMessages({ search = "", page = 1, perPage = 10 }: { search?: string; page?: number; perPage?: number } = {}): Promise<ContactMessagesResult> {
  // The backend only accepts a `search` query parameter — page/limit are
  // rejected with a validation error, so paging is done client-side.
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());

  const url = `${API_BASE}${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await adminRequest<any>(url, { method: "GET" });
  const allItems = parseList(response).map(normalizeMessage);
  const safePerPage = perPage > 0 ? perPage : allItems.length || 1;
  const start = (page - 1) * safePerPage;

  return {
    items: allItems.slice(start, start + safePerPage),
    total: readTotal(response, allItems.length),
    page,
    perPage,
  };
}

export async function getMessageDetails(id: string): Promise<ContactMessage> {
  const response = await adminRequest<any>(`${API_BASE}/${id}`, { method: "GET" });
  // Details are nested under data.message. Note: fetching the details also
  // marks the message as read on the backend.
  const item = response?.data?.message ?? response?.data ?? response ?? {};
  return normalizeMessage(item);
}

export async function deleteMessage(id: string): Promise<void> {
  await adminRequest<any>(`${API_BASE}/${id}`, { method: "DELETE" });
}