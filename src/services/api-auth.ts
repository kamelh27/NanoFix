import { apiPost } from "@/lib/api";
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
  return res.user;
}

export async function registerApi(name: string, email: string, password: string): Promise<AuthUser> {
  const res = await apiPost<AuthResponse>("/api/auth/register", { name, email, password });
  Cookies.set("auth_token", res.token, { expires: 7 });
  return res.user;
}
