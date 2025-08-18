"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { listClientsApi } from "@/services/api-clients";
import { createDeviceApi, uploadDevicePhotosApi } from "@/services/api-devices";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const schema = z.object({
  clientId: z.string().min(1, "Selecciona un cliente"),
  brand: z.string().min(1, "Marca requerida"),
  model: z.string().min(1, "Modelo requerido"),
  issue: z.string().min(3, "Describe el problema"),
  status: z.enum(["en_reparacion", "reparado", "entregado"]),
  intakeDate: z.string(),
});

type FormData = z.infer<typeof schema>;

export default function NewDevicePage() {
  const router = useRouter();
  const params = useSearchParams();
  const preClientId = params.get("clientId") || "";

  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await listClientsApi();
        setClients(data);
      } catch (e: any) {
        setError(e?.message || "Error cargando clientes");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);
  function toLocalDatetimeInputValue(d: Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  const [files, setFiles] = useState<File[]>([]);
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => {
    return () => { previews.forEach((u) => URL.revokeObjectURL(u)); };
  }, [previews]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientId: preClientId,
      status: "en_reparacion",
      intakeDate: toLocalDatetimeInputValue(new Date()),
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const created = await createDeviceApi({
        clientId: data.clientId,
        brand: data.brand,
        model: data.model,
        issue: data.issue,
        status: data.status,
        intakeDate: new Date(data.intakeDate).toISOString(),
      });
      if (files.length) {
        try {
          await uploadDevicePhotosApi(created.id, files);
        } catch (e: any) {
          console.warn("Upload photos failed:", e?.message || e);
          alert("Equipo creado, pero falló la subida de fotos. Puedes intentar subirlas luego desde el detalle.");
        }
      }
      router.replace("/devices");
    } catch (e: any) {
      alert(e?.message || "No se pudo crear el equipo");
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold mb-4">Nuevo equipo</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white p-4 rounded-xl border">
        <div>
          <label className="block text-sm mb-1">Cliente</label>
          <select {...register("clientId")} className="w-full border rounded-md px-3 py-2 text-sm">
            <option value="">{loading ? "Cargando clientes…" : "Selecciona un cliente"}</option>
            {!loading && clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
          {errors.clientId && <p className="text-xs text-red-600 mt-1">{errors.clientId.message}</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Marca</label>
            <input {...register("brand")} className="w-full border rounded-md px-3 py-2 text-sm" />
            {errors.brand && <p className="text-xs text-red-600 mt-1">{errors.brand.message}</p>}
          </div>
          <div>
            <label className="block text-sm mb-1">Modelo</label>
            <input {...register("model")} className="w-full border rounded-md px-3 py-2 text-sm" />
            {errors.model && <p className="text-xs text-red-600 mt-1">{errors.model.message}</p>}
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Problema</label>
          <textarea {...register("issue")} className="w-full border rounded-md px-3 py-2 text-sm" rows={3} />
          {errors.issue && <p className="text-xs text-red-600 mt-1">{errors.issue.message}</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Estado</label>
            <select {...register("status")} className="w-full border rounded-md px-3 py-2 text-sm">
              <option value="en_reparacion">En reparación</option>
              <option value="reparado">Reparado</option>
              <option value="entregado">Entregado</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Fecha de ingreso</label>
            <input type="datetime-local" {...register("intakeDate")} className="w-full border rounded-md px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Fotos de evidencia (opcional)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              const list = Array.from(e.target.files || []);
              const accepted = list.filter((f) => f.size <= 8 * 1024 * 1024);
              if (accepted.length < list.length) alert("Se ignoraron archivos > 8MB");
              setFiles(accepted.slice(0, 8));
            }}
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
          <p className="text-xs text-slate-500 mt-1">Hasta 8 imágenes. Máx 8MB c/u.</p>
          {previews.length > 0 && (
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {previews.map((src, i) => (
                <div key={i} className="relative">
                  <img src={src} alt={`preview-${i}`} className="h-24 w-full object-cover rounded border" />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button disabled={isSubmitting} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">Guardar</button>
          <Link href="/devices" className="px-4 py-2 rounded-md text-sm border">Cancelar</Link>
        </div>
      </form>
    </div>
  );
}
