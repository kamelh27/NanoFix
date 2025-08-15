export type ID = string;

export type DeviceStatus = "en_reparacion" | "reparado" | "entregado";

export interface Client {
  id: ID;
  name: string;
  phone: string;
  email?: string;
  createdAt: string; // ISO
}

export interface DeviceHistoryItem {
  id: ID;
  date: string; // ISO
  status: DeviceStatus;
  note?: string;
}

export interface Device {
  id: ID;
  clientId: ID;
  brand: string;
  model: string;
  issue: string;
  status: DeviceStatus;
  intakeDate: string; // ISO
  history: DeviceHistoryItem[];
}

export interface Product {
  id: ID;
  name: string;
  supplier?: string;
  quantity: number;
  price: number; // unit price
  createdAt: string;
}

export interface InvoiceItem {
  id: ID;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Invoice {
  id: ID;
  clientId: ID;
  deviceId?: ID;
  items: InvoiceItem[];
  total: number;
  date: string;
}
