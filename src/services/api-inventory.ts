import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import type { Product } from "@/types";

interface ApiProduct {
  _id: string;
  name: string;
  quantity: number;
  price: number;
  supplier?: string;
  minStock?: number;
  createdAt: string;
}

function toProduct(p: ApiProduct): Product {
  return {
    id: p._id,
    name: p.name,
    quantity: p.quantity,
    price: p.price,
    supplier: p.supplier,
    createdAt: p.createdAt,
  };
}

export async function listProductsApi(): Promise<Product[]> {
  const data = await apiGet<ApiProduct[]>("/api/inventory");
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
  minStock?: number;
}): Promise<Product> {
  const data = await apiPost<ApiProduct>("/api/inventory", payload);
  return toProduct(data);
}

export async function updateProductApi(
  id: string,
  payload: Partial<{ name: string; quantity: number; price: number; supplier?: string; minStock?: number }>
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
