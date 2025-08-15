"use client";

import { useParams, useRouter } from "next/navigation";
import { getProductApi, updateProductApi, deleteProductApi } from "@/services/api-inventory";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Product } from "@/types";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    </div>
  );
}
