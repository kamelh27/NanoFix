import { apiPost, apiGet } from "@/lib/api";
import Cookies from "js-cookie";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "technician" | string;
}

interface AuthResponse {
  user: AuthUser;
  token: string;
}

export async function loginApi(email: string, password: string): Promise<AuthUser> {
  const res = await apiPost<AuthResponse>("/api/auth/login", { email, password });
  Cookies.set("auth_token", res.token, { expires: 7 });
  Cookies.set("user_role", res.user.role, { expires: 7 });
  return res.user;
}

export async function registerApi(name: string, email: string, password: string): Promise<AuthUser> {
  const res = await apiPost<AuthResponse>("/api/auth/register", { name, email, password });
  Cookies.set("auth_token", res.token, { expires: 7 });
  Cookies.set("user_role", res.user.role, { expires: 7 });
  return res.user;
}

// Admin-only helper: create a technician without switching current session cookies
export async function adminCreateUserApi(name: string, email: string, password: string): Promise<AuthUser> {
  const res = await apiPost<AuthResponse>("/api/auth/register", { name, email, password });
  // Do NOT set cookies here; keep the admin logged in
  return res.user;
}

export async function meApi(): Promise<AuthUser> {
  const res = await apiGet<{ user: AuthUser }>("/api/auth/me");
  return res.user;
}
