// Shared UI-facing types mapped from backend DTOs

export interface Product {
  id: string;
  name: string;
  quantity: number;
  price: number;
  supplier?: string;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  createdAt: string;
}

export type DeviceStatus = "en_reparacion" | "reparado" | "entregado";

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  productId?: string;
}

export interface Invoice {
  id: string;
  clientId: string;
  deviceId?: string;
  items: InvoiceItem[];
  total: number;
  date: string; // ISO string
  notes?: string;
}
