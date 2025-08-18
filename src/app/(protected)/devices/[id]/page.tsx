"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getDeviceApi, deleteDeviceApi, type UIDeviceDetail } from "@/services/api-devices";
import { addRepairApi, uploadRepairPhotosApi, addRepairPartsApi } from "@/services/api-repairs";
import { listProductsApi } from "@/services/api-inventory";
import type { DeviceStatus, Product } from "@/types";

const STATUS_OPTS: { value: DeviceStatus; label: string }[] = [
  { value: "en_reparacion", label: "En reparación" },
  { value: "reparado", label: "Reparado" },
  { value: "entregado", label: "Entregado" },
];

export default function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [device, setDevice] = useState<UIDeviceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => { return () => { previews.forEach((u) => URL.revokeObjectURL(u)); }; }, [previews]);
  const [parts, setParts] = useState<Array<{ productId: string; quantity: number }>>([]);
  const [uploadingRepairId, setUploadingRepairId] = useState<string | null>(null);
  const hiddenPhotoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [d, inv] = await Promise.all([
          getDeviceApi(id),
          listProductsApi().catch(() => []),
        ]);
        setDevice(d);
        setProducts(inv);
      } catch (e: any) {
        setError(e?.message || "Error cargando equipo");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Cargando…</h1>
        <Link href="/devices" className="text-blue-700 hover:underline">Volver a equipos</Link>
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">{error || "Equipo no encontrado"}</h1>
        <Link href="/devices" className="text-blue-700 hover:underline">Volver a equipos</Link>
      </div>
    );
  }

  const onUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const status = String(form.get("status")) as DeviceStatus;
    const note = String(form.get("note") || "");
    try {
      const created = await addRepairApi({ deviceId: device.id, status, comment: note || undefined });
      // Upload photos selected in this form
      if (files.length) {
        try {
          await uploadRepairPhotosApi(created._id, files);
        } catch (err: any) {
          console.warn("Upload repair photos failed:", err?.message || err);
          alert("Actualización creada, pero falló la subida de fotos.");
        }
      }
      // Consume selected parts
      const cleanParts = parts.filter(p => p.productId && p.quantity > 0);
      if (cleanParts.length) {
        try {
          await addRepairPartsApi(created._id, cleanParts);
        } catch (err: any) {
          const msg = err?.message || "No se pudieron consumir los productos (stock insuficiente?)";
          alert(msg);
        }
      }
      // reset local UI state
      setFiles([]);
      setParts([]);
      (e.currentTarget as HTMLFormElement).reset();
      const refreshed = await getDeviceApi(id);
      setDevice(refreshed);
    } catch (err: any) {
      alert(err?.message || "No se pudo actualizar el estado");
    }
  };

  const onDelete = async () => {
    if (!confirm("¿Eliminar equipo?")) return;
    try {
      await deleteDeviceApi(device.id);
      router.replace("/devices");
    } catch (err: any) {
      alert(err?.message || "No se pudo eliminar el equipo");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{device.brand} {device.model}</h1>
        <div className="flex gap-2">
          <button onClick={onDelete} className="text-sm border px-3 py-2 rounded-md text-red-700 hover:bg-red-50">Eliminar</button>
          <Link href="/devices" className="text-sm border px-3 py-2 rounded-md">Volver</Link>
        </div>
      </div>

      <section className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-4 md:col-span-2 space-y-3">
          <h2 className="font-medium">Datos del equipo</h2>
          <div className="text-sm grid grid-cols-1 md:grid-cols-2 gap-y-2">
            <div><span className="text-slate-500">Cliente:</span> <Link className="text-blue-700 hover:underline" href={`/clients/${device.clientId}`}>{device.clientName || ""}</Link></div>
            <div><span className="text-slate-500">Problema:</span> {device.issue}</div>
            <div><span className="text-slate-500">Estado:</span> {device.status.replace("_"," ")}</div>
            <div><span className="text-slate-500">Ingreso:</span> {new Date(device.intakeDate).toLocaleString()}</div>
          </div>

          <form onSubmit={onUpdate} className="mt-4 flex flex-col gap-3 items-start">
            <select name="status" defaultValue={device.status} className="border rounded-md px-3 py-2 text-sm">
              {STATUS_OPTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <input name="note" placeholder="Nota (opcional)" className="border rounded-md px-3 py-2 text-sm w-full" />

            <div className="w-full">
              <label className="block text-sm mb-1">Fotos de esta actualización (opcional)</label>
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
              {previews.length > 0 && (
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {previews.map((src, i) => (
                    <img key={i} src={src} alt={`preview-${i}`} className="h-24 w-full object-cover rounded border" />
                  ))}
                </div>
              )}
            </div>

            <div className="w-full">
              <label className="block text-sm mb-1">Consumir productos de inventario (opcional)</label>
              <div className="space-y-2">
                {parts.map((row, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <select
                      className="border rounded-md px-2 py-1 text-sm"
                      value={row.productId}
                      onChange={(e) => {
                        const v = e.target.value;
                        setParts(ps => ps.map((p,i)=> i===idx ? { ...p, productId: v } : p));
                      }}
                    >
                      <option value="">Seleccione producto</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (stock {p.quantity})</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      className="border rounded-md px-2 py-1 text-sm w-24"
                      value={row.quantity}
                      onChange={(e) => {
                        const q = parseInt(e.target.value || "0", 10) || 0;
                        setParts(ps => ps.map((p,i)=> i===idx ? { ...p, quantity: q } : p));
                      }}
                    />
                    <button type="button" className="text-red-700 text-sm" onClick={() => setParts(ps => ps.filter((_,i)=> i!==idx))}>Quitar</button>
                  </div>
                ))}
                <button type="button" className="text-sm border px-2 py-1 rounded" onClick={() => setParts(ps => [...ps, { productId: "", quantity: 1 }])}>+ Agregar producto</button>
              </div>
            </div>

            <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">Actualizar</button>
          </form>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <h2 className="font-medium mb-2">Historial</h2>
          <ul className="divide-y text-sm">
            {device.history.map((h) => (
              <li key={h.id} className="py-2 flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{h.status.replace("_"," ")}</div>
                  {h.note && <div className="text-slate-600">{h.note}</div>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-slate-500 whitespace-nowrap">{new Date(h.date).toLocaleString()}</div>
                  <button
                    className="text-sm border px-2 py-1 rounded"
                    onClick={() => {
                      setUploadingRepairId(h.id);
                      hiddenPhotoInputRef.current?.click();
                    }}
                  >Subir fotos</button>
                </div>
              </li>
            ))}
          </ul>
          {/* hidden input for uploading photos to an existing repair */}
          <input
            ref={hiddenPhotoInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={async (e) => {
              const list = Array.from(e.target.files || []);
              const accepted = list.filter((f) => f.size <= 8 * 1024 * 1024).slice(0,8);
              if (!uploadingRepairId || accepted.length === 0) { e.currentTarget.value = ""; return; }
              try {
                await uploadRepairPhotosApi(uploadingRepairId, accepted);
                const refreshed = await getDeviceApi(id);
                setDevice(refreshed);
              } catch (err: any) {
                alert(err?.message || "No se pudieron subir las fotos");
              } finally {
                setUploadingRepairId(null);
                e.currentTarget.value = "";
              }
            }}
          />
        </div>
      </section>
    </div>
  );
}
