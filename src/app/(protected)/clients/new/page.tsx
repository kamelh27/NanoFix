"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClientApi } from "@/services/api-clients";
import { useRouter } from "next/navigation";
import Link from "next/link";

const schema = z.object({
  name: z.string().min(2, "Nombre requerido"),
  phone: z.string().min(3, "Teléfono requerido"),
  email: z.string().email().optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

export default function NewClientPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await createClientApi({ name: data.name, phone: data.phone, email: data.email || undefined });
      router.replace("/clients");
    } catch (e: any) {
      alert(e?.message || "No se pudo crear el cliente");
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold mb-4">Nuevo cliente</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white p-4 rounded-xl border">
        <div>
          <label className="block text-sm mb-1">Nombre</label>
          <input {...register("name")} className="w-full border rounded-md px-3 py-2 text-sm" />
          {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-sm mb-1">Teléfono</label>
          <input {...register("phone")} className="w-full border rounded-md px-3 py-2 text-sm" />
          {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>}
        </div>
        <div>
          <label className="block text-sm mb-1">Correo (opcional)</label>
          <input {...register("email")} className="w-full border rounded-md px-3 py-2 text-sm" />
          {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message as string}</p>}
        </div>
        <div className="flex gap-2">
          <button disabled={isSubmitting} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">Guardar</button>
          <Link href="/clients" className="px-4 py-2 rounded-md text-sm border">Cancelar</Link>
        </div>
      </form>
    </div>
  );
}
