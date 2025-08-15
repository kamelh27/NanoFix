import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import type { Client } from "@/types";

interface ApiClient {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  createdAt: string;
}

function toClient(c: ApiClient): Client {
  return {
    id: c._id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    createdAt: c.createdAt,
  };
}

export async function listClientsApi(): Promise<Client[]> {
  const data = await apiGet<ApiClient[]>("/api/clients");
  return data.map(toClient);
}

export async function getClientApi(id: string): Promise<Client> {
  const data = await apiGet<ApiClient>(`/api/clients/${id}`);
  return toClient(data);
}

export async function createClientApi(payload: { name: string; phone: string; email?: string }): Promise<Client> {
  const data = await apiPost<ApiClient>(`/api/clients`, payload);
  return toClient(data);
}

export async function updateClientApi(
  id: string,
  payload: Partial<{ name: string; phone: string; email?: string }>
): Promise<Client> {
  const data = await apiPut<ApiClient>(`/api/clients/${id}`, payload);
  return toClient(data);
}

export async function deleteClientApi(id: string): Promise<void> {
  await apiDelete(`/api/clients/${id}`);
}
