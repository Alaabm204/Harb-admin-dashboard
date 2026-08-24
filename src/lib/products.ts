import { createAdminRequest } from "@/lib/adminRequest"

export interface ProductImage { url: string; id?: string }

export interface Product {
  id: string;
  nameEn: string;
  nameAr: string;
  categoryId: string;
  categoryName: string;
  available: boolean;
  order: number;
  images: ProductImage[];
  imageUrls: string[];
  // Attached spec-sheet PDF (may be absent).
  pdfUrl?: string;
}


export interface ProductListResult { items: Product[]; total: number; page: number; perPage: number; }

const API_BASE = "/api/proxy/admin/products";

const adminRequest = createAdminRequest();

// The admin list endpoint returns images as [{ url }] WITHOUT any id, and there
// is no single-product GET route. Image ids are therefore only available in the
// upload response — they are persisted in localStorage keyed by product id so
// deletion keeps working after a page reload.
const PRODUCT_IMAGE_STORE_KEY = "product-image-ids";

type ProductImageStore = Record<string, ProductImage[]>;

const readStoredImages = (): ProductImageStore => {
  try {
    const raw = localStorage.getItem(PRODUCT_IMAGE_STORE_KEY);
    return raw ? (JSON.parse(raw) as ProductImageStore) : {};
  } catch {
    return {};
  }
};

const writeStoredImages = (store: ProductImageStore) => {
  try {
    localStorage.setItem(PRODUCT_IMAGE_STORE_KEY, JSON.stringify(store));
  } catch {
    // Best-effort persistence; ignore quota/serialization failures.
  }
};

export function getStoredProductImages(productId: string): ProductImage[] {
  return readStoredImages()[productId] ?? [];
}

function setStoredProductImages(productId: string, images: ProductImage[]) {
  if (!productId) return;
  const store = readStoredImages();
  store[productId] = images;
  writeStoredImages(store);
}

// The admin list (and every other list response) never includes the attached
// PDF; only POST …/pdf echoes its URL, and GET /products/:id exposes it as
// `productPdf`. Uploads are therefore persisted locally so the edit form can
// still show a working link after a reload.
const PRODUCT_PDF_STORE_KEY = "product-pdf-urls";

type ProductPdfStore = Record<string, string>;

const readStoredPdfs = (): ProductPdfStore => {
  try {
    const raw = localStorage.getItem(PRODUCT_PDF_STORE_KEY);
    return raw ? (JSON.parse(raw) as ProductPdfStore) : {};
  } catch {
    return {};
  }
};

const writeStoredPdfs = (store: ProductPdfStore) => {
  try {
    localStorage.setItem(PRODUCT_PDF_STORE_KEY, JSON.stringify(store));
  } catch {
    // Best-effort persistence; ignore quota/serialization failures.
  }
};

export function getStoredProductPdfUrl(productId: string): string {
  return readStoredPdfs()[productId] ?? "";
}

function setStoredProductPdfUrl(productId: string, url: string) {
  if (!productId || !url) return;
  const store = readStoredPdfs();
  store[productId] = url;
  writeStoredPdfs(store);
}

function clearStoredProductPdfUrl(productId: string) {
  if (!productId) return;
  const store = readStoredPdfs();
  if (store[productId]) {
    delete store[productId];
    writeStoredPdfs(store);
  }
}


const normalizeText = (value: unknown) => (typeof value === "string" ? value.trim() : "");
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

// Backend product shape:
// { _id, categoryId: { _id, nameEn }, nameAr, nameEn, isAvailable, displayOrder, images: [{ url }] }
// Note: the API never returns descriptions or PDFs for products, and the
// embedded category only carries nameEn.
const normalizeProduct = (item: any): Product => {
  const rawCategory = item?.categoryId;
  const categoryId =
    rawCategory && typeof rawCategory === "object" ? String(rawCategory._id ?? "") : String(rawCategory ?? "");
  const categoryName =
    normalizeText(
      typeof rawCategory === "object" && rawCategory ? rawCategory.nameEn : "",
    ) || "Uncategorized";
  const images: ProductImage[] = Array.isArray(item?.images)
    ? item.images
        .map((img: any) =>
          typeof img === "string"
            ? { url: img, id: undefined }
            : {
                url: String(img?.url ?? img?.imageUrl ?? img?.imgUrl ?? ""),
                id:
                  img?._id
                    ? String(img._id)
                    : img?.id
                      ? String(img.id)
                      : img?.imageId
                        ? String(img.imageId)
                        : img?.imgId
                          ? String(img.imgId)
                          : img?.image_id
                            ? String(img.image_id)
                            : img?.img_id
                              ? String(img.img_id)
                              : undefined,
              },
        )
        .filter((img: ProductImage) => img.url)
    : [];

  return {
    id: String(item?.id ?? item?._id ?? ""),
    nameEn: normalizeText(item?.nameEn ?? item?.name) || "Untitled",
    nameAr: normalizeText(item?.nameAr) || "بدون اسم",
    categoryId,
    categoryName,
    available: normalizeBoolean(item?.isAvailable ?? item?.available, true),
    order: normalizeNumber(item?.displayOrder ?? item?.order),
    images,
    imageUrls: images.map((img) => img.url),
    pdfUrl: normalizePdfUrl(item),
  };
}

// The attached PDF may come back as a plain URL string or an object
// ({ url }) under any of a few likely keys depending on the endpoint.
function normalizePdfUrl(item: any): string | undefined {
  const raw =
    item?.pdf ??
    item?.pdfURL ??
    item?.pdfUrl ??
    item?.productPdf ??
    item?.file;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (raw && typeof raw === "object") {
    const url = String(raw.url ?? "");
    return url || undefined;
  }
  return undefined;
}



// Backend list responses look like:
// { success, message, data: { products: [...], pagination: {...} } }
const parseList = (response: any): any[] => {
  if (!response || typeof response !== "object") return [];
  const payload = response.data ?? response;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.products)) return payload.products;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.results)) return payload.results;
  return [];
};

export async function getProducts({ search = "", categoryId = "", page = 1, perPage = 10 }: { search?: string; categoryId?: string; page?: number; perPage?: number } = {}): Promise<ProductListResult> {
  // The backend only accepts `search` and `categoryId` query parameters —
  // page/limit are rejected with a validation error, so paging is client-side.
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  if (categoryId) params.set("categoryId", categoryId);

  const url = `${API_BASE}${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await adminRequest<any>(url, { method: "GET" });
  const allItems = parseList(response).map((item: any) => {
    const product = normalizeProduct(item);
    // The list never carries the PDF URL — fall back to the locally persisted
    // value from the last upload.
    return {
      ...product,
      pdfUrl: product.pdfUrl || getStoredProductPdfUrl(product.id) || undefined,
    };

  });

  const safePerPage = perPage > 0 ? perPage : allItems.length || 1;
  const start = (page - 1) * safePerPage;

  return {
    items: allItems.slice(start, start + safePerPage),
    total: allItems.length,
    page,
    perPage,
  };
}

export async function createProduct(payload: { nameEn: string; nameAr: string; categoryId: string; available?: boolean; order?: number; }): Promise<Product> {
  const response = await adminRequest<any>(API_BASE, {
    method: "POST",
    body: JSON.stringify({
      nameEn: payload.nameEn,
      nameAr: payload.nameAr,
      categoryId: payload.categoryId,
      isAvailable: payload.available ?? true,
      displayOrder: payload.order ?? 0,
    }),
  });
  const item = response?.data ?? response;
  return normalizeProduct(item);
}

export async function updateProduct(id: string, payload: Partial<Product>): Promise<Product> {
  const response = await adminRequest<any>(`${API_BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      nameEn: payload.nameEn,
      nameAr: payload.nameAr,
      categoryId: payload.categoryId,
      isAvailable: payload.available,
      displayOrder: payload.order,
    }),
  });
  // The update response may not echo the record; fall back to the payload.
  const item = response?.data && typeof response.data === "object" && response.data._id ? response.data : { ...payload, _id: id };
  return normalizeProduct(item);
}

export async function deleteProduct(id: string): Promise<void> {
  await adminRequest<any>(`${API_BASE}/${id}`, { method: "DELETE" });
  // The product is gone — drop any cached image ids / pdf url for it.
  if (id) {
    const store = readStoredImages();
    if (store[id]) {
      delete store[id];
      writeStoredImages(store);
    }
    clearStoredProductPdfUrl(id);
  }
}


export async function uploadProductImages(productId: string, files: File[]): Promise<ProductImage[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));
  const response = await adminRequest<any>(`${API_BASE}/${productId}/images`, { method: "POST", body: formData });
  const payload = response?.data ?? response ?? {};
  const list = Array.isArray(payload) ? payload : [];
  const uploaded = list
    .map((img: any) => ({
      url: String(img?.url ?? ""),
      // Only a Mongo-style _id is accepted by the DELETE endpoint.
      id: img?._id ? String(img._id) : img?.id ? String(img.id) : undefined,
    }))
    .filter((img: ProductImage) => img.url);

  // Merge with previously known images so earlier uploads keep their ids.
  const previous = getStoredProductImages(productId).filter(
    (img) => !uploaded.some((u: ProductImage) => u.url === img.url),
  );
  const result = [...previous, ...uploaded];
  setStoredProductImages(productId, result);
  return result;
}

export async function deleteProductImage(productId: string, imageId: string): Promise<void> {
  await adminRequest<any>(`${API_BASE}/${productId}/images/${imageId}`, { method: "DELETE" });
  // Keep the local cache consistent with the server.
  setStoredProductImages(
    productId,
    getStoredProductImages(productId).filter((img) => img.id !== imageId),
  );
}

// Upload / replace the product's attached spec-sheet PDF.
// POST /admin/products/:id/pdf (multipart — the endpoint requires exactly one
// file under the field key "file").
export async function uploadProductPdf(productId: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await adminRequest<any>(`${API_BASE}/${productId}/pdf`, {
    method: "POST",
    body: formData,
  });
  const payload = response?.data ?? response ?? {};
  // Response shape: { pdfURL, public_id, fileName, fileSize }
  const url =
    String(payload?.pdfURL ?? "") ||
    String(payload?.url ?? "") ||
    normalizePdfUrl(payload) ||
    "";
  if (productId && url) setStoredProductPdfUrl(productId, url);
  return url;
}

// Remove the product's attached PDF.
// DELETE /admin/products/:id/pdf
export async function deleteProductPdf(productId: string): Promise<void> {
  await adminRequest<any>(`${API_BASE}/${productId}/pdf`, { method: "DELETE" });
  if (productId) clearStoredProductPdfUrl(productId);
}


