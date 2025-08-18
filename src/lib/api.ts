import Cookies from "js-cookie";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function authHeaders(): Record<string, string> {
  const token = Cookies.get("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.message) msg = data.message;
    } catch {}
    throw new Error(msg);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}

function buildHeaders(init?: RequestInit): HeadersInit {
  const base: Record<string, string> = { "Content-Type": "application/json", ...authHeaders() };
  const h = init?.headers;
  if (!h) return base;
  if (h instanceof Headers) {
    h.forEach((v, k) => { base[k] = v; });
  } else if (Array.isArray(h)) {
    for (const [k, v] of h) base[k] = String(v);
  } else {
    Object.assign(base, h as Record<string, string>);
  }
  return base as HeadersInit;
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    credentials: "include",
    headers: buildHeaders(init),
    ...init,
  });
  return handle<T>(res);
}

export async function apiPost<T>(path: string, body?: any, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: buildHeaders(init),
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...init,
  });
  return handle<T>(res);
}

// For multipart/form-data uploads. Do NOT set Content-Type manually; the browser sets it with boundary.
export async function apiUpload<T>(path: string, form: FormData, init?: RequestInit): Promise<T> {
  const headers: HeadersInit = { ...(authHeaders() as Record<string, string>) };
  if (init?.headers) {
    if (init.headers instanceof Headers) {
      init.headers.forEach((v, k) => { (headers as any)[k] = v; });
    } else if (Array.isArray(init.headers)) {
      for (const [k, v] of init.headers) (headers as any)[k] = String(v);
    } else {
      Object.assign(headers as any, init.headers as Record<string, string>);
    }
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers,
    body: form,
    ...init,
  });
  return handle<T>(res);
}

export async function apiPut<T>(path: string, body?: any, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PUT",
    credentials: "include",
    headers: buildHeaders(init),
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...init,
  });
  return handle<T>(res);
}

export async function apiDelete<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "DELETE",
    credentials: "include",
    headers: buildHeaders(init),
    ...init,
  });
  return handle<T>(res);
}

export function apiUrl(path: string) {
  return `${BASE_URL}${path}`;
}
