import { createAdminRequest } from "@/lib/adminRequest"

export interface Category { id: string; nameEn: string; nameAr: string; count: number; }
export interface CategoryListResult { items: Category[]; total: number; page: number; perPage: number; }

const API_BASE = "/api/proxy/admin/categories";

const adminRequest = createAdminRequest();

const normalizeText = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const normalizeCount = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const normalizeCategory = (item: any): Category => {
  const id = item?.id ?? item?._id ?? item?.categoryId ?? "";
  const nameEn =
    normalizeText(item?.nameEn ?? item?.englishName ?? item?.name ?? item?.titleEn) ||
    normalizeText(item?.nameAr ?? item?.arabicName ?? item?.titleAr) ||
    "Untitled";
  const nameAr =
    normalizeText(item?.nameAr ?? item?.arabicName ?? item?.titleAr ?? item?.nameArabic) ||
    "بدون اسم";

  return {
    id: String(id),
    nameEn,
    nameAr,
    count: normalizeCount(item?.productsCount ?? item?.count ?? item?.product_count),
  };
};

// Backend list responses look like:
// { success, message, data: { categories: [...], pagination: {...} } }
const parseList = (response: any): any[] => {
  if (!response || typeof response !== "object") return [];
  const payload = response.data ?? response;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.categories)) return payload.categories;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.results)) return payload.results;
  return [];
};

export async function getCategories({ search = "", page = 1, perPage = 10 }: { search?: string; page?: number; perPage?: number } = {}): Promise<CategoryListResult> {
  // The backend only accepts a `search` query parameter — page/limit are
  // rejected with a validation error, so paging is done client-side.
  const params = new URLSearchParams();
  const query = search.trim();
  if (query) params.set("search", query);

  const url = `${API_BASE}${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await adminRequest<any>(url, { method: "GET" });
  const allItems = parseList(response).map(normalizeCategory);
  const safePerPage = perPage > 0 ? perPage : allItems.length || 1;
  const start = (page - 1) * safePerPage;

  return {
    items: allItems.slice(start, start + safePerPage),
    total: allItems.length,
    page,
    perPage,
  };
}

export async function createCategory(nameEn: string, nameAr: string): Promise<Category> {
  const response = await adminRequest<any>(API_BASE, {
    method: "POST",
    body: JSON.stringify({ nameEn, nameAr }),
  });
  // Create returns the new record under data.newCategory.
  const item = response?.data?.newCategory ?? response?.data ?? response;
  return normalizeCategory(item);
}

export async function updateCategory(id: string, nameEn: string, nameAr: string): Promise<Category> {
  const response = await adminRequest<any>(`${API_BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify({ nameEn, nameAr }),
  });
  const item = response?.data ?? response;
  return normalizeCategory(item);
}

export async function deleteCategory(id: string): Promise<void> {
  await adminRequest<any>(`${API_BASE}/${id}`, { method: "DELETE" });
}