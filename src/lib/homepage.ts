import { createAdminRequest } from "@/lib/adminRequest"

export interface HeroSection { titleEn: string; titleAr: string; subtitleEn: string; subtitleAr: string; imageUrl: string; }
export interface HomepageContent { hero: HeroSection; featuredProducts: string[]; featuredProjects: string[]; }

const API_BASE = "/api/proxy/admin/homepage";

const adminRequest = createAdminRequest();

// Backend homepage shape:
// { _id, heroTitleAr, heroTitleEn, heroSubtitleAr, heroSubtitleEn,
//   heroImage: { url, public_id, responsiveVariants } }
// The GET response does not include the featured product/project selections;
// they can only be set through the featured-products/featured-projects
// endpoints.
// Featured selections may come back as plain ids or as objects such as
// { productId, productName, displayOrder } / { projectId, ... }.
const toIdList = (value: unknown, key: string): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item: any) => (typeof item === "string" ? item : String(item?.[key] ?? item?._id ?? item?.id ?? "")))
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
    featuredProducts: toIdList(payload?.featuredProducts, "productId"),
    featuredProjects: toIdList(payload?.featuredProjects, "projectId"),
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
