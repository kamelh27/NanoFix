import { apiGet, apiUpload, apiUrl, apiPut } from "@/lib/api";

export type LogoResponse = { url: string | null };
export type BrandSettings = { name: string | null };

export async function getLogo(): Promise<LogoResponse> {
  return apiGet<LogoResponse>("/api/branding/logo");
}

export async function uploadLogo(file: File): Promise<LogoResponse> {
  const form = new FormData();
  form.append("logo", file);
  return apiUpload<LogoResponse>("/api/branding/logo", form);
}

export function absoluteLogoUrl(path: string | null): string | null {
  return path ? apiUrl(path) : null;
}

export async function getBrandSettings(): Promise<BrandSettings> {
  return apiGet<BrandSettings>("/api/branding/settings");
}

export async function updateBrandSettings(name: string | null): Promise<BrandSettings> {
  return apiPut<BrandSettings>("/api/branding/settings", { name });
}
