import { createAdminRequest } from "@/lib/adminRequest"

export interface ProjectImage { url: string; id?: string }

export interface Project {
  id: string;
  nameEn: string;
  nameAr: string;
  year: string;
  client: string;
  featured: boolean;
  available: boolean;
  images: ProjectImage[];
  imageUrls: string[];
}

export interface ProjectListResult { items: Project[]; total: number; page: number; perPage: number; }

const API_BASE = "/api/proxy/admin/projects";

const adminRequest = createAdminRequest();

// The admin list endpoint returns images as [{ url }] WITHOUT any id, and there
// is no single-project GET route. Image ids are therefore only available in the
// upload response — they are persisted in localStorage keyed by project id so
// deletion keeps working after a page reload.
const PROJECT_IMAGE_STORE_KEY = "project-image-ids";

type ProjectImageStore = Record<string, ProjectImage[]>;

const readStoredImages = (): ProjectImageStore => {
  try {
    const raw = localStorage.getItem(PROJECT_IMAGE_STORE_KEY);
    return raw ? (JSON.parse(raw) as ProjectImageStore) : {};
  } catch {
    return {};
  }
};

const writeStoredImages = (store: ProjectImageStore) => {
  try {
    localStorage.setItem(PROJECT_IMAGE_STORE_KEY, JSON.stringify(store));
  } catch {
    // Best-effort persistence; ignore quota/serialization failures.
  }
};

export function getStoredProjectImages(projectId: string): ProjectImage[] {
  return readStoredImages()[projectId] ?? [];
}

function setStoredProjectImages(projectId: string, images: ProjectImage[]) {
  if (!projectId) return;
  const store = readStoredImages();
  store[projectId] = images;
  writeStoredImages(store);
}

const normalizeText = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const normalizeBoolean = (value: unknown, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.toLowerCase();
    if (v === "true" || v === "1" || v === "yes") return true;
    if (v === "false" || v === "0" || v === "no") return false;
  }
  return fallback;
};

// Backend project shape:
// { _id, nameAr, nameEn, completionYear, clientName, isFeatured, isActive, images: [{ url }] }
// Note: descriptions are accepted on write but never returned on read.
// isFeatured is read-only — sending it on create/update is rejected by the API.
const normalizeProject = (item: any): Project => {
  const images: ProjectImage[] = Array.isArray(item?.images)
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
        .filter((img: ProjectImage) => img.url)
    : [];

  return {
    id: String(item?.id ?? item?._id ?? ""),
    nameEn: normalizeText(item?.nameEn ?? item?.name) || "Untitled",
    nameAr: normalizeText(item?.nameAr) || "بدون اسم",
    // completionYear arrives as a NUMBER (e.g. 2025) — stringify before
    // trimming, otherwise normalizeText() turns it into an empty string and
    // the edit form loses the saved value.
    year:
      item?.completionYear === undefined || item?.completionYear === null
        ? normalizeText(item?.year)
        : String(item.completionYear).trim(),
    client: normalizeText(item?.clientName ?? item?.client),
    featured: normalizeBoolean(item?.isFeatured ?? item?.featured),
    available: normalizeBoolean(item?.isActive ?? item?.available, true),
    images,
    imageUrls: images.map((img) => img.url),
  };
}

// Backend list responses look like:
// { success, message, data: { projects: [...], pagination: {...} } }
const parseList = (response: any): any[] => {
  if (!response || typeof response !== "object") return [];
  const payload = response.data ?? response;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.projects)) return payload.projects;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.results)) return payload.results;
  return [];
};

export async function getProjects({ search = "", page = 1, perPage = 10 }: { search?: string; page?: number; perPage?: number } = {}): Promise<ProjectListResult> {
  // The backend only accepts a `search` query parameter — page/limit are
  // rejected with a validation error, so paging is done client-side.
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());

  const url = `${API_BASE}${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await adminRequest<any>(url, { method: "GET" });
  const allItems = parseList(response).map(normalizeProject);
  const safePerPage = perPage > 0 ? perPage : allItems.length || 1;
  const start = (page - 1) * safePerPage;

  return {
    items: allItems.slice(start, start + safePerPage),
    total: allItems.length,
    page,
    perPage,
  };
}

export async function createProject(payload: {
  nameEn: string;
  nameAr: string;
  year: string;
  client: string;
  available?: boolean;
}): Promise<Project> {
  const response = await adminRequest<any>(API_BASE, {
    method: "POST",
    body: JSON.stringify({
      nameEn: payload.nameEn,
      nameAr: payload.nameAr,
      completionYear: Number(payload.year) || new Date().getFullYear(),
      clientName: payload.client,
      isActive: payload.available ?? true,
    }),
  });
  const item = response?.data ?? response;
  return normalizeProject(item);
}

export async function updateProject(id: string, payload: Partial<Project>): Promise<Project> {
  const body: Record<string, unknown> = {};
  if (payload.nameEn !== undefined) body.nameEn = payload.nameEn;
  if (payload.nameAr !== undefined) body.nameAr = payload.nameAr;
  if (payload.year !== undefined) body.completionYear = Number(payload.year);
  if (payload.client !== undefined) body.clientName = payload.client;
  if (payload.available !== undefined) body.isActive = payload.available;

  const response = await adminRequest<any>(`${API_BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  // The update response does not echo the record; fall back to the payload.
  const item =
    response?.data && typeof response.data === "object" && response.data._id
      ? response.data
      : {
          ...payload,
          completionYear: payload.year,
          clientName: payload.client,
          isActive: payload.available,
          _id: id,
        };
  return normalizeProject(item);
}

export async function deleteProject(id: string): Promise<void> {
  await adminRequest<any>(`${API_BASE}/${id}`, { method: "DELETE" });
  // The project is gone — drop any cached image ids for it.
  if (id) {
    const store = readStoredImages();
    if (store[id]) {
      delete store[id];
      writeStoredImages(store);
    }
  }
}

export async function uploadProjectImages(projectId: string, files: File[]): Promise<ProjectImage[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));
  const response = await adminRequest<any>(`${API_BASE}/${projectId}/images`, { method: "POST", body: formData });
  const payload = response?.data ?? response ?? {};
  // The projects endpoint nests the created images under `uploadedImages`
  // ({ projectId, uploadedImages: [...] }), unlike products where `data` is the
  // array itself. Accept both shapes.
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.uploadedImages)
      ? payload.uploadedImages
      : Array.isArray(payload?.images)
        ? payload.images
        : [];
  const uploaded = list
    .map((img: any) => ({
      url: String(img?.url ?? ""),
      // Only a Mongo-style _id is accepted by the DELETE endpoint.
      id: img?._id ? String(img._id) : img?.id ? String(img.id) : undefined,
    }))
    .filter((img: ProjectImage) => img.url);

  // Merge with previously known images so earlier uploads keep their ids.
  const previous = getStoredProjectImages(projectId).filter(
    (img) => !uploaded.some((u: ProjectImage) => u.url === img.url),
  );
  const result = [...previous, ...uploaded];
  setStoredProjectImages(projectId, result);
  return result;
}

export async function deleteProjectImage(projectId: string, imageId: string): Promise<void> {
  await adminRequest<any>(`${API_BASE}/${projectId}/images/${imageId}`, { method: "DELETE" });
  // Keep the local cache consistent with the server.
  setStoredProjectImages(
    projectId,
    getStoredProjectImages(projectId).filter((img) => img.id !== imageId),
  );
}
