import { createAdminRequest } from "@/lib/adminRequest"

export interface CompanyPhone { number: string; label: string; }

export interface CompanyInfo {
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  address: string;
  email: string;
  phoneNumbers: CompanyPhone[];
  googleMapsUrl: string;
  workingHours: string;
  socialMediaLinks: {
    facebook: string;
    linkedin: string;
  };
  logoUrl: string;
}

const API_BASE = "/api/proxy/admin/company-info";

const adminRequest = createAdminRequest();

const LOGO_CACHE_KEY = "company-logo-url";

const readLogoCache = (): string => {
  try {
    const raw = localStorage.getItem(LOGO_CACHE_KEY);
    return raw ? String(raw) : "";
  } catch {
    return "";
  }
};

const writeLogoCache = (url: string) => {
  try {
    localStorage.setItem(LOGO_CACHE_KEY, url);
  } catch {
    // Ignore storage failures.
  }
};

// Backend company-info shape:
// { _id, nameAr, nameEn, descriptionAr, descriptionEn, address, email,
//   phoneNumbers: [{ number, label }], googleMapsUrl, workingHours,
//   socialMediaLinks: { facebook, linkedin } }
// Note: the GET response does not include a logo; the logo is managed via
// the upload/delete endpoints.
const normalizeCompanyInfo = (item: any): CompanyInfo => ({
  nameEn: String(item?.nameEn ?? ""),
  nameAr: String(item?.nameAr ?? ""),
  descriptionEn: String(item?.descriptionEn ?? ""),
  descriptionAr: String(item?.descriptionAr ?? ""),
  address: String(item?.address ?? ""),
  email: String(item?.email ?? ""),
  phoneNumbers: Array.isArray(item?.phoneNumbers)
    ? item.phoneNumbers.map((phone: any) => ({
        number: String(phone?.number ?? ""),
        label: String(phone?.label ?? ""),
      }))
    : [],
  googleMapsUrl: String(item?.googleMapsUrl ?? item?.mapsUrl ?? ""),
  workingHours: String(item?.workingHours ?? item?.hours ?? ""),
  socialMediaLinks: {
    facebook: String(item?.socialMediaLinks?.facebook ?? ""),
    linkedin: String(item?.socialMediaLinks?.linkedin ?? ""),
  },
  logoUrl: readLogoCache(),
});

export async function getCompanyInfo(): Promise<CompanyInfo> {
  const response = await adminRequest<any>(API_BASE, { method: "GET" });
  return normalizeCompanyInfo(response?.data ?? response ?? {});
}

export async function updateCompanyInfo(info: Partial<CompanyInfo>): Promise<CompanyInfo> {
  const response = await adminRequest<any>(API_BASE, {
    method: "PUT",
    body: JSON.stringify({
      nameEn: info.nameEn,
      nameAr: info.nameAr,
      descriptionEn: info.descriptionEn,
      descriptionAr: info.descriptionAr,
      address: info.address,
      email: info.email,
      phoneNumbers: info.phoneNumbers ?? [],
      googleMapsUrl: info.googleMapsUrl,
      workingHours: info.workingHours,
      socialMediaLinks: {
        facebook: info.socialMediaLinks?.facebook ?? "",
        linkedin: info.socialMediaLinks?.linkedin ?? "",
      },
    }),
  });
  return normalizeCompanyInfo(response?.data ?? response ?? {});
}

export async function uploadCompanyLogo(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("logo", file);
  const response = await adminRequest<any>(`${API_BASE}/logo`, {
    method: "POST",
    body: formData,
  });
  const payload = response?.data ?? response ?? {};
  const logo = payload.logo;
  let url = "";
  if (logo && typeof logo === "object") url = String(logo.url ?? "");
  if (Array.isArray(payload) && payload[0]) url = String(payload[0].url ?? "");
  if (!url) url = String(payload.logoUrl ?? payload.url ?? "");
  if (url) writeLogoCache(url);
  return url;
}

export async function deleteCompanyLogo(): Promise<void> {
  await adminRequest<any>(`${API_BASE}/logo`, { method: "DELETE" });
  writeLogoCache("");
}