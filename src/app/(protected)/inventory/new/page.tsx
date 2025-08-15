"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createProductApi } from "@/services/api-inventory";
import { useRouter } from "next/navigation";
import Link from "next/link";

const schema = z.object({
  name: z.string().min(2, "Nombre requerido"),
  supplier: z.string().optional(),
  quantity: z.coerce.number().int().min(0),
  price: z.coerce.number().min(0),
});

type FormData = z.infer<typeof schema>;

export default function NewProductPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { quantity: 0, price: 0 } });

  const onSubmit = async (data: FormData) => {
    try {
      await createProductApi({ name: data.name, supplier: data.supplier, quantity: data.quantity, price: data.price });
      router.replace("/inventory");
    } catch (e: any) {
      alert(e?.message || "No se pudo crear el producto");
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold mb-4">Nuevo producto</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white p-4 rounded-xl border">
        <div>
          <label className="block text-sm mb-1">Nombre</label>
          <input {...register("name")} className="w-full border rounded-md px-3 py-2 text-sm" />
          {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-sm mb-1">Proveedor (opcional)</label>
          <input {...register("supplier")} className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Cantidad</label>
            <input type="number" {...register("quantity")} className="w-full border rounded-md px-3 py-2 text-sm" />
            {errors.quantity && <p className="text-xs text-red-600 mt-1">{errors.quantity.message}</p>}
          </div>
          <div>
            <label className="block text-sm mb-1">Precio unitario</label>
            <input type="number" step="0.01" {...register("price")} className="w-full border rounded-md px-3 py-2 text-sm" />
            {errors.price && <p className="text-xs text-red-600 mt-1">{errors.price.message}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <button disabled={isSubmitting} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">Guardar</button>
          <Link href="/inventory" className="px-4 py-2 rounded-md text-sm border">Cancelar</Link>
        </div>
      </form>
    </div>
  );
}
