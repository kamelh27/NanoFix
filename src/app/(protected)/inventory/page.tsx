"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listProductsApi, deleteProductApi } from "@/services/api-inventory";
import { Package, PackageMinus, Plus, Pencil, Trash2, Search } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { Product } from "@/types";
import BarcodeScanner from "@/components/BarcodeScanner";

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const data = await listProductsApi(query ? { q: query } : undefined);
      setProducts(data);
    } catch (e: any) {
      setError(e?.message || "Error cargando inventario");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setTimeout(() => { load(); }, 400);
    return () => clearTimeout(t);
  }, [query]);

  const onDelete = async (id: string) => {
    if (!confirm("¿Eliminar producto?")) return;
    try {
      await deleteProductApi(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (e: any) {
      alert(e?.message || "No se pudo eliminar");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold flex items-center gap-2"><Package className="h-6 w-6 text-blue-700"/> Inventario</h1>
        <Link href="/inventory/new" className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm px-3 py-2 rounded-md hover:bg-blue-700">
          <Plus className="h-4 w-4"/> Nuevo producto
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative w-full max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, proveedor, categoría o código de barras"
            className="w-full border rounded-md pl-9 pr-8 py-2 text-sm"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs"
              aria-label="Limpiar búsqueda"
            >
              ×
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowScanner(true)}
          className="px-3 py-2 text-sm border rounded-md bg-white hover:bg-slate-50"
        >Escanear</button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left p-3">Producto</th>
              <th className="text-left p-3">Proveedor</th>
              <th className="text-left p-3">Cantidad</th>
              <th className="text-left p-3">Precio unitario</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">Cargando…</td>
              </tr>
            )}
            {error && !loading && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-red-700">{error}</td>
              </tr>
            )}
            {!loading && !error && products.map((p) => {
              const low = p.quantity <= 3;
              return (
                <tr key={p.id} className={`border-t ${low ? "bg-amber-50/40" : ""}`}>
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3">{p.supplier || "—"}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-2 ${low ? "text-amber-700" : ""}`}>
                      {low && <PackageMinus className="h-4 w-4"/>}
                      {p.quantity}
                    </span>
                  </td>
                  <td className="p-3">{formatCurrency(p.price)}</td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/inventory/${p.id}`} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border hover:bg-slate-50"><Pencil className="h-3 w-3"/> Editar</Link>
                      <button onClick={() => onDelete(p.id)} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border text-red-700 hover:bg-red-50"><Trash2 className="h-3 w-3"/> Eliminar</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && !error && products.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">Sin productos</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {showScanner && (
        <BarcodeScanner
          onDetected={(code) => { setQuery(code); setShowScanner(false); }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
