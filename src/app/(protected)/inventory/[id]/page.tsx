"use client";

import { useParams, useRouter } from "next/navigation";
import { getProductApi, updateProductApi, deleteProductApi, purchaseProductApi } from "@/services/api-inventory";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Product } from "@/types";
import BarcodeScanner from "@/components/BarcodeScanner";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [savingPurchase, setSavingPurchase] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const data = await getProductApi(id);
      setProduct(data);
    } catch (e: any) {
      setError(e?.message || "No se pudo cargar el producto");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  if (loading) {
    return <div className="p-4 text-slate-500">Cargando…</div>;
  }

  if (error) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Error</h1>
        <p className="text-red-700 text-sm">{error}</p>
        <Link href="/inventory" className="text-blue-700 hover:underline">Volver a inventario</Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Producto no encontrado</h1>
        <Link href="/inventory" className="text-blue-700 hover:underline">Volver a inventario</Link>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const updates = {
      name: String(form.get("name") || product.name),
      supplier: (String(form.get("supplier") || "") || undefined) as string | undefined,
      quantity: Number(form.get("quantity") || product.quantity),
      price: Number(form.get("price") || product.price),
      barcode: (String(form.get("barcode") || "").trim() || undefined) as string | undefined,
      category: (String(form.get("category") || "").trim() || undefined) as string | undefined,
    };
    try {
      const updated = await updateProductApi(product.id, updates);
      setProduct(updated);
    } catch (e: any) {
      alert(e?.message || "No se pudo guardar");
    }
  };

  const onDelete = async () => {
    if (!confirm("¿Eliminar producto?")) return;
    try {
      await deleteProductApi(product.id);
      router.replace("/inventory");
    } catch (e: any) {
      alert(e?.message || "No se pudo eliminar");
    }
  };

  const onSubmitPurchase = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!product) return;
    const form = new FormData(e.currentTarget);
    const quantity = Number(form.get("p_quantity") || 0);
    const unitCost = Number(form.get("p_unitCost") || 0);
    const supplier = String(form.get("p_supplier") || "").trim() || undefined;
    const notes = String(form.get("p_notes") || "").trim() || undefined;
    if (quantity <= 0 || unitCost < 0) {
      alert("Cantidad o costo inválidos");
      return;
    }
    try {
      setSavingPurchase(true);
      const { product: updated } = await purchaseProductApi({ productId: product.id, quantity, unitCost, supplier, notes });
      setProduct(updated);
      (e.currentTarget as HTMLFormElement).reset();
      alert("Compra registrada");
    } catch (e: any) {
      alert(e?.message || "No se pudo registrar la compra");
    } finally {
      setSavingPurchase(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Editar producto</h1>
        <div className="flex gap-2">
          <button onClick={onDelete} className="text-sm border px-3 py-2 rounded-md text-red-700 hover:bg-red-50">Eliminar</button>
          <Link href="/inventory" className="text-sm border px-3 py-2 rounded-md">Volver</Link>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 bg-white p-4 rounded-xl border">
        <div>
          <label className="block text-sm mb-1">Nombre</label>
          <input name="name" defaultValue={product.name} className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm mb-1">Proveedor</label>
          <input name="supplier" defaultValue={product.supplier || ""} className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm mb-1">Categoría</label>
          <input name="category" defaultValue={product.category || ""} className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm mb-1">Código de barras</label>
          <div className="relative">
            <input name="barcode" defaultValue={product.barcode || ""} className="w-full border rounded-md px-3 py-2 text-sm pr-24" />
            <button type="button" onClick={() => setShowScanner(true)} className="absolute right-1 top-1/2 -translate-y-1/2 text-xs px-3 py-1 rounded-md border bg-slate-50 hover:bg-slate-100">Escanear</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Cantidad</label>
            <input type="number" name="quantity" defaultValue={product.quantity} className="w-full border rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm mb-1">Precio unitario</label>
            <input type="number" step="0.01" name="price" defaultValue={product.price} className="w-full border rounded-md px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex gap-2">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">Guardar</button>
        </div>
      </form>

      <form onSubmit={onSubmitPurchase} className="space-y-4 bg-white p-4 rounded-xl border">
        <h2 className="text-lg font-medium">Registrar compra</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Cantidad a comprar</label>
            <input name="p_quantity" type="number" min={1} className="w-full border rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm mb-1">Costo unitario</label>
            <input name="p_unitCost" type="number" step="0.01" min={0} className="w-full border rounded-md px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Proveedor (opcional)</label>
          <input name="p_supplier" defaultValue={product.supplier || ""} className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm mb-1">Notas (opcional)</label>
          <input name="p_notes" className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <div className="flex gap-2">
          <button disabled={savingPurchase} className="bg-emerald-600 text-white px-4 py-2 rounded-md text-sm hover:bg-emerald-700 disabled:opacity-50">Registrar compra</button>
        </div>
      </form>
      {showScanner && (
        <BarcodeScanner
          onDetected={(code) => {
            // Set the input value imperatively
            const input = document.querySelector<HTMLInputElement>('input[name="barcode"]');
            if (input) input.value = code;
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
