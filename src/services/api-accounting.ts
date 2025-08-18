import { apiDelete, apiGet, apiPost, apiUrl } from "@/lib/api";
import type { DailySummary, RangeDaySummary, Transaction } from "@/types";

function toISODateOnly(d: Date | string): string {
  // If already a plain date string, avoid parsing which can shift due to UTC interpretation
  if (typeof d === "string") {
    const s = d.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const dt = new Date(s);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Backend DTO
interface ApiTransaction {
  _id: string;
  date: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  category?: string;
  product?: string | { _id: string; name?: string; category?: string; barcode?: string };
  quantity?: number;
  createdAt: string;
  updatedAt: string;
}

function toTx(t: ApiTransaction): Transaction {
  const productId = typeof t.product === "string" ? t.product : t.product?._id;
  const productName = typeof t.product === "object" && t.product ? (t.product as any).name : undefined;
  return {
    id: t._id,
    date: t.date,
    type: t.type,
    amount: t.amount,
    description: t.description,
    category: t.category,
    productId,
    productName,
    quantity: t.quantity,
  };
}

export async function listTransactionsApi(params?: {
  from?: Date | string;
  to?: Date | string;
  type?: "income" | "expense";
  category?: string;
  limit?: number;
}): Promise<Transaction[]> {
  const q = new URLSearchParams();
  if (params?.from) q.set("from", new Date(params.from as any).toISOString());
  if (params?.to) q.set("to", new Date(params.to as any).toISOString());
  if (params?.type) q.set("type", params.type);
  if (params?.category) q.set("category", params.category);
  if (params?.limit) q.set("limit", String(params.limit));
  const data = await apiGet<ApiTransaction[]>(`/api/accounting/transactions${q.toString() ? `?${q.toString()}` : ""}`);
  return data.map(toTx);
}

export async function createTransactionApi(payload: {
  date?: Date | string;
  type: "income" | "expense";
  amount: number;
  description: string;
  category?: string;
}): Promise<Transaction> {
  const body = { ...payload } as any;
  if (body.date) body.date = toISODateOnly(body.date);
  const data = await apiPost<ApiTransaction>(`/api/accounting/transactions`, body);
  return toTx(data);
}

export async function deleteTransactionApi(id: string): Promise<void> {
  await apiDelete(`/api/accounting/transactions/${id}`);
}

export async function dailySummaryApi(date: Date | string): Promise<DailySummary> {
  const ds = toISODateOnly(date);
  const data = await apiGet<{ date: string; income: number; expense: number; net: number; openingBalance: number; closingBalance: number; transactions: ApiTransaction[] }>(`/api/accounting/daily?date=${encodeURIComponent(ds)}`);
  return {
    date: data.date,
    income: data.income,
    expense: data.expense,
    net: data.net,
    openingBalance: data.openingBalance,
    closingBalance: data.closingBalance,
    transactions: data.transactions.map(toTx),
  };
}

export async function rangeSummaryApi(from: Date, to: Date): Promise<RangeDaySummary[]> {
  const q = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
  const data = await apiGet<{ from: string; to: string; days: Array<{ date: string; income: number; expense: number; net: number }> }>(`/api/accounting/range?${q.toString()}`);
  return data.days;
}

export const accountingCsvUrls = {
  // Currently we only expose CSV via /api/reports endpoints
  summary(from: Date, to: Date, granularity: "day" | "week" | "month") {
    const q = new URLSearchParams({ from: from.toISOString(), to: to.toISOString(), granularity });
    return apiUrl(`/api/reports/summary.csv?${q.toString()}`);
  },
};

export async function getCashSessionApi(date: Date | string): Promise<{ date: string; dateKey: string; openingBalance: number; notes: string }> {
  const ds = toISODateOnly(date);
  return apiGet(`/api/accounting/cash-session?date=${encodeURIComponent(ds)}`);
}

export async function setCashSessionApi(payload: { date?: Date | string; openingBalance: number; notes?: string }): Promise<{ dateKey: string; openingBalance: number; notes: string }> {
  const body: any = { ...payload };
  if (body.date) body.date = toISODateOnly(body.date);
  return apiPost(`/api/accounting/cash-session`, body);
}
