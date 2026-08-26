import { createAdminRequest } from "@/lib/adminRequest"

export interface HeroSection { titleEn: string; titleAr: string; subtitleEn: string; subtitleAr: string; imageUrl: string; }
export interface HomepageContent { hero: HeroSection; featuredProducts: string[]; featuredProjects: string[]; }

const API_BASE = "/api/proxy/admin/homepage";
// The ADMIN homepage endpoint never returns the featured selections. They ARE
// persisted server-side though — the PUBLIC /homepage endpoint exposes them
// (verified live: data.featuredProducts / data.featuredProjects with {_id,…}
// objects). That public endpoint is therefore the cross-device source of truth.
const PUBLIC_HOMEPAGE_BASE = "/api/proxy/homepage";

const adminRequest = createAdminRequest();

// Backend homepage shapes:
// • ADMIN  GET /admin/homepage → hero text/image only (bilingual fields);
//   it NEVER includes the featured selections.
// • PUBLIC GET /homepage → hero plus featuredProducts/featuredProjects as
//   arrays of objects ({ _id, name, …, displayOrder }).
const toIdList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item: any) =>
      typeof item === "string"
        ? item
        : String(item?._id ?? item?.id ?? item?.productId ?? item?.projectId ?? ""),
    )
    .filter(Boolean);
};

export async function getHomepage(): Promise<HomepageContent> {
  const response = await adminRequest<any>(API_BASE, { method: "GET" });
  const payload = response?.data ?? response ?? {};
  return {
    hero: {
      titleEn: String(payload?.heroTitleEn ?? ""),
      titleAr: String(payload?.heroTitleAr ?? ""),
      subtitleEn: String(payload?.heroSubtitleEn ?? ""),
      subtitleAr: String(payload?.heroSubtitleAr ?? ""),
      imageUrl: String(payload?.heroImage?.url ?? ""),
    },
    featuredProducts: [],
    featuredProjects: [],
  };
}

// Reads the CURRENTLY SAVED featured product/project ids from the server so the
// admin UI shows the same choice on every device. A cache-buster keeps any
// intermediary from serving a stale copy right after a save.
export async function getFeaturedSelections(): Promise<{ products: string[]; projects: string[] }> {
  const response = await adminRequest<any>(
    `${PUBLIC_HOMEPAGE_BASE}?_=${Date.now()}`,
    { method: "GET" },
  );
  const payload = response?.data ?? response ?? {};
  return {
    products: toIdList(payload?.featuredProducts),
    projects: toIdList(payload?.featuredProjects),
  };
}

export async function updateHeroSection(hero: Partial<HeroSection>): Promise<HeroSection> {
  const body: Record<string, unknown> = {};
  if (hero.titleEn !== undefined) body.heroTitleEn = hero.titleEn;
  if (hero.titleAr !== undefined) body.heroTitleAr = hero.titleAr;
  if (hero.subtitleEn !== undefined) body.heroSubtitleEn = hero.subtitleEn;
  if (hero.subtitleAr !== undefined) body.heroSubtitleAr = hero.subtitleAr;

  const response = await adminRequest<any>(`${API_BASE}/hero`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  const data = response?.data ?? response ?? {};
  return {
    titleEn: String(data.heroTitleEn ?? hero.titleEn ?? ""),
    titleAr: String(data.heroTitleAr ?? hero.titleAr ?? ""),
    subtitleEn: String(data.heroSubtitleEn ?? hero.subtitleEn ?? ""),
    subtitleAr: String(data.heroSubtitleAr ?? hero.subtitleAr ?? ""),
    imageUrl: String(data.heroImage?.url ?? hero.imageUrl ?? ""),
  };
}

export async function uploadHeroImage(file: File): Promise<string> {
  // The backend expects the multipart field to be named "hero-image".
  const formData = new FormData();
  formData.append("hero-image", file);
  const response = await adminRequest<any>(`${API_BASE}/hero-image`, { method: "POST", body: formData });
  const payload = response?.data ?? response ?? {};
  const image = payload.heroImage;
  if (image && typeof image === "object") return String(image.url ?? "");
  if (Array.isArray(payload) && payload[0]) return String(payload[0].url ?? "");
  return String(payload.imageUrl ?? payload.url ?? "");
}

export async function deleteHeroImage(): Promise<void> {
  await adminRequest<any>(`${API_BASE}/hero-image`, { method: "DELETE" });
}

export async function setFeaturedProducts(productIds: string[]): Promise<string[]> {
  // The backend REQUIRES at least one featured product (verified live:
  // {"productIds":[]} → 422 "At least 1 featured product is required").
  // Surface that as an error instead of silently pretending the save worked.
  if (!productIds.length) {
    throw new Error("At least one featured product must be selected.")
  }
  const response = await adminRequest<any>(`${API_BASE}/featured-products`, {
    method: "POST",
    body: JSON.stringify({ productIds: productIds.map((id) => ({ productId: id })) }),
  });
  const data = response?.data ?? response ?? {};
  const result = data.productIds ?? data.featuredProducts;
  if (Array.isArray(result)) {
    return result
      .map((item: any) =>
        typeof item === "string" ? item : String(item?.productId ?? item?._id ?? item?.id ?? ""),
      )
      .filter(Boolean);
  }
  return productIds;
}

export async function setFeaturedProjects(projectIds: string[]): Promise<string[]> {
  if (!projectIds.length) {
    throw new Error("At least one featured project must be selected.")
  }
  const response = await adminRequest<any>(`${API_BASE}/featured-projects`, {
    method: "POST",
    body: JSON.stringify({ projectIds: projectIds.map((id) => ({ projectId: id })) }),
  });
  const data = response?.data ?? response ?? {};
  const result = data.projectIds ?? data.featuredProjects;
  if (Array.isArray(result)) {
    return result
      .map((item: any) =>
        typeof item === "string" ? item : String(item?.projectId ?? item?._id ?? item?.id ?? ""),
      )
      .filter(Boolean);
  }
  return projectIds;
}
