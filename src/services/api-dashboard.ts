import { apiGet } from "@/lib/api";

interface ApiInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
}
interface ApiInvoice {
  _id: string;
  client: string;
  device?: string;
  items: ApiInvoiceItem[];
  total: number;
  createdAt: string;
}
interface ApiProductBrief {
  _id: string;
  name: string;
  quantity: number;
  price: number;
  supplier?: string;
  minStock?: number;
  createdAt: string;
}

export interface DashboardSummary {
  activeRepairs: number;
  incomeLast30Days: number;
  recentInvoices: Array<{ id: string; total: number; date: string }>;
  lowInventory: Array<{ id: string; name: string; quantity: number; price: number; supplier?: string }>;
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const data = await apiGet<{ activeRepairs: number; incomeLast30Days: number; recentInvoices: ApiInvoice[]; lowInventory: ApiProductBrief[] }>(
    "/api/dashboard"
  );
  return {
    activeRepairs: data.activeRepairs,
    incomeLast30Days: data.incomeLast30Days,
    recentInvoices: data.recentInvoices.map((i) => ({ id: i._id, total: i.total, date: i.createdAt })),
    lowInventory: data.lowInventory.map((p) => ({ id: p._id, name: p.name, quantity: p.quantity, price: p.price, supplier: p.supplier })),
  };
}
