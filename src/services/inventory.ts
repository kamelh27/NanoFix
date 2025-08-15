"use client";
import { v4 as uuid } from "uuid";
import { Product } from "@/types";
import { readArray, writeArray } from "./storage";

const KEY = "inventory";

export function listProducts(): Product[] {
  return readArray<Product>(KEY).sort((a, b) => a.name.localeCompare(b.name));
}

export function getProduct(id: string): Product | undefined {
  return listProducts().find((p) => p.id === id);
}

export function createProduct(data: Omit<Product, "id" | "createdAt">): Product {
  const product: Product = { id: uuid(), createdAt: new Date().toISOString(), ...data };
  const list = listProducts();
  list.push(product);
  writeArray(KEY, list);
  return product;
}

export function updateProduct(id: string, data: Partial<Omit<Product, "id" | "createdAt">>): Product | undefined {
  const list = listProducts();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return undefined;
  list[idx] = { ...list[idx], ...data };
  writeArray(KEY, list);
  return list[idx];
}

export function deleteProduct(id: string): void {
  const list = listProducts().filter((p) => p.id !== id);
  writeArray(KEY, list);
}
