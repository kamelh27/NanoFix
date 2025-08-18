import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import type { Product, Transaction } from "@/types";

interface ApiProduct {
  _id: string;
  name: string;
  quantity: number;
  price: number;
  supplier?: string;
  minStock?: number;
  barcode?: string;
  category?: string;
  createdAt: string;
}

function toProduct(p: ApiProduct): Product {
  return {
    id: p._id,
    name: p.name,
    quantity: p.quantity,
    price: p.price,
    supplier: p.supplier,
    barcode: p.barcode,
    category: p.category,
    createdAt: p.createdAt,
  };
}

export async function listProductsApi(params?: {
  q?: string;
  barcode?: string;
  category?: string;
  minQty?: number;
  maxQty?: number;
  limit?: number;
}): Promise<Product[]> {
  const qs = params
    ? "?" + Object.entries(params)
        .filter(([_, v]) => v !== undefined && v !== null && String(v).length > 0)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&")
    : "";
  const data = await apiGet<ApiProduct[]>(`/api/inventory${qs}`);
  return data.map(toProduct);
}

export async function getProductApi(id: string): Promise<Product> {
  const data = await apiGet<ApiProduct>(`/api/inventory/${id}`);
  return toProduct(data);
}

export async function createProductApi(payload: {
  name: string;
  quantity: number;
  price: number;
  supplier?: string;
  barcode?: string;
  category?: string;
  minStock?: number;
}): Promise<Product> {
  const data = await apiPost<ApiProduct>("/api/inventory", payload);
  return toProduct(data);
}

export async function updateProductApi(
  id: string,
  payload: Partial<{ name: string; quantity: number; price: number; supplier?: string; barcode?: string; category?: string; minStock?: number }>
): Promise<Product> {
  const data = await apiPut<ApiProduct>(`/api/inventory/${id}`, payload);
  return toProduct(data);
}

export async function deleteProductApi(id: string): Promise<void> {
  await apiDelete(`/api/inventory/${id}`);
}

export async function adjustStockApi(items: Array<{ productId: string; quantityUsed: number }>): Promise<{ updated: number } & Record<string, any>> {
  const data = await apiPost<{ updated: number } & Record<string, any>>("/api/inventory/adjust", { items });
  return data;
}

// Register a purchase: increases product stock and records an expense transaction
interface ApiTransaction {
  _id: string;
  date: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  category?: string;
  product?: string;
  quantity?: number;
  createdAt: string;
  updatedAt: string;
}

function toTx(t: ApiTransaction): Transaction {
  return {
    id: t._id,
    date: t.date,
    type: t.type,
    amount: t.amount,
    description: t.description,
    category: t.category,
    productId: t.product,
    quantity: t.quantity,
  };
}

export async function purchaseProductApi(payload: { productId: string; quantity: number; unitCost: number; supplier?: string; notes?: string }): Promise<{ product: Product; transaction: Transaction }> {
  const data = await apiPost<{ product: ApiProduct; transaction: ApiTransaction }>("/api/inventory/purchase", payload);
  return { product: toProduct(data.product), transaction: toTx(data.transaction) };
}

export async function sellProductApi(payload: { productId: string; quantity: number; unitPrice: number; notes?: string }): Promise<{ product: Product; transaction: Transaction }> {
  const data = await apiPost<{ product: ApiProduct; transaction: ApiTransaction }>("/api/inventory/sell", payload);
  return { product: toProduct(data.product), transaction: toTx(data.transaction) };
}
