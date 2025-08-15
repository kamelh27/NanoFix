"use client";
import { v4 as uuid } from "uuid";
import { Invoice, InvoiceItem } from "@/types";
import { readArray, writeArray } from "./storage";

const KEY = "invoices";

export function listInvoices(): Invoice[] {
  return readArray<Invoice>(KEY).sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getInvoice(id: string): Invoice | undefined {
  return listInvoices().find((i) => i.id === id);
}

export function createInvoice(data: Omit<Invoice, "id" | "total" | "date"> & { date?: string }): Invoice {
  const total = data.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  const invoice: Invoice = {
    id: uuid(),
    total,
    date: data.date ?? new Date().toISOString(),
    clientId: data.clientId,
    deviceId: data.deviceId,
    items: data.items,
  };
  const list = listInvoices();
  list.push(invoice);
  writeArray(KEY, list);
  return invoice;
}

export function deleteInvoice(id: string): void {
  const list = listInvoices().filter((i) => i.id !== id);
  writeArray(KEY, list);
}

export function incomeBetween(start: Date, end: Date): number {
  const s = start.getTime();
  const e = end.getTime();
  return listInvoices()
    .filter((i) => {
      const t = new Date(i.date).getTime();
      return t >= s && t <= e;
    })
    .reduce((sum, i) => sum + i.total, 0);
}
