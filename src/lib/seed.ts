"use client";
import { createClient, listClients } from "@/services/clients";
import { createDevice, listDevices } from "@/services/devices";
import { createProduct, listProducts } from "@/services/inventory";
import { createInvoice, listInvoices } from "@/services/invoices";

export function seedIfEmpty() {
  if (typeof window === "undefined") return;
  if (listClients().length > 0) return; // already seeded

  const juan = createClient({ name: "Juan Pérez", phone: "555-1234", email: "juan@example.com" });
  const ana = createClient({ name: "Ana López", phone: "555-5678", email: "ana@example.com" });

  const d1 = createDevice({
    clientId: juan.id,
    brand: "Samsung",
    model: "Galaxy S21",
    issue: "Pantalla rota",
    status: "en_reparacion",
    intakeDate: new Date().toISOString(),
  });
  const d2 = createDevice({
    clientId: ana.id,
    brand: "Apple",
    model: "MacBook Pro",
    issue: "No enciende",
    status: "reparado",
    intakeDate: new Date(Date.now() - 86400000 * 2).toISOString(),
  });

  createProduct({ name: "Pantalla Samsung S21", supplier: "TecnoParts", quantity: 2, price: 1800 });
  createProduct({ name: "Batería iPhone 12", supplier: "iParts", quantity: 10, price: 900 });
  createProduct({ name: "Pasta térmica", supplier: "CompuWorld", quantity: 1, price: 150 });

  createInvoice({
    clientId: juan.id,
    deviceId: d1.id,
    items: [
      { id: "1", description: "Diagnóstico", quantity: 1, unitPrice: 150 },
      { id: "2", description: "Reparación de pantalla", quantity: 1, unitPrice: 2000 },
    ],
  });
  createInvoice({
    clientId: ana.id,
    deviceId: d2.id,
    items: [
      { id: "1", description: "Cambio de fuente", quantity: 1, unitPrice: 1200 },
    ],
  });
}
