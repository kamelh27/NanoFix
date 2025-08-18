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
  barcode?: string;
  category?: string;
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

// Accounting & Reports
export type TransactionType = "income" | "expense";

export interface Transaction {
  id: ID;
  date: string; // ISO
  type: TransactionType;
  amount: number;
  description: string;
  category?: string;
  // Optional links to inventory
  productId?: ID;
  quantity?: number;
  productName?: string;
}

export interface DailySummary {
  date: string; // day start ISO
  income: number;
  expense: number;
  net: number;
  openingBalance: number;
  closingBalance: number;
  transactions: Transaction[];
}

export interface RangeDaySummary {
  date: string; // YYYY-MM-DD
  income: number;
  expense: number;
  net: number;
}

export interface ReportSummaryRow {
  bucket: string; // day/week/month key
  income: number;
  expense: number;
  net: number;
}

export interface TopProductRow {
  productId?: ID;
  name: string;
  quantity: number;
  value: number;
}

export interface ExpensesByCategoryRow {
  category: string;
  total: number;
}
