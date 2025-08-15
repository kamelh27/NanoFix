import { apiDelete, apiGet, apiPost, apiUrl } from "@/lib/api";
import type { Invoice } from "@/types";

// Backend DTOs
interface ApiInvoiceItem {
  product?: string;
  description: string;
  quantity: number;
  unitPrice: number;
}
interface ApiInvoice {
  _id: string;
  client: { _id: string; name: string; phone?: string; email?: string } | string;
  device?: { _id: string; brand: string; model: string; issue?: string } | string;
  items: ApiInvoiceItem[];
  total: number;
  notes?: string;
  createdAt: string;
}

function toUI(inv: ApiInvoice): { invoice: Invoice; client?: any; device?: any } {
  const client = typeof inv.client === "string" ? undefined : inv.client;
  const device = typeof inv.device === "string" ? undefined : inv.device;
  const invoice: Invoice = {
    id: inv._id,
    clientId: client?._id || (typeof inv.client === "string" ? inv.client : ""),
    deviceId: device?._id || (typeof inv.device === "string" ? inv.device : undefined),
    items: inv.items.map((it, idx) => ({ id: `${idx}`, description: it.description, quantity: it.quantity, unitPrice: it.unitPrice })),
    total: inv.total,
    date: inv.createdAt,
  };
  return { invoice, client, device };
}

export async function fetchInvoices(): Promise<Invoice[]> {
  const data = await apiGet<ApiInvoice[]>("/api/invoices");
  return data.map((i) => toUI(i).invoice);
}

export async function fetchInvoice(id: string): Promise<{ invoice: Invoice; client?: any; device?: any }> {
  const data = await apiGet<ApiInvoice>(`/api/invoices/${id}`);
  return toUI(data);
}

export async function fetchInvoicesDetailed(): Promise<Array<{ invoice: Invoice; client?: any; device?: any }>> {
  const data = await apiGet<ApiInvoice[]>("/api/invoices");
  return data.map((i) => toUI(i));
}

export async function createInvoiceApi(payload: {
  client: string;
  device?: string;
  items: { description: string; quantity: number; unitPrice: number; product?: string }[];
  notes?: string;
}): Promise<Invoice> {
  const data = await apiPost<ApiInvoice>("/api/invoices", payload);
  return toUI(data).invoice;
}

export async function deleteInvoiceApi(id: string): Promise<void> {
  await apiDelete(`/api/invoices/${id}`);
}

export function serverPdfUrl(id: string) {
  return apiUrl(`/api/invoices/${id}/pdf`);
}

export async function incomeBetweenApi(from: Date, to: Date): Promise<number> {
  const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
  const data = await apiGet<{ from: string; to: string; total: number }>(`/api/invoices/income/range?${params.toString()}`);
  return data.total;
}
