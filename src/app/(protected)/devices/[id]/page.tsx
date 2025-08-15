"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getDeviceApi, deleteDeviceApi, type UIDeviceDetail } from "@/services/api-devices";
import { addRepairApi } from "@/services/api-repairs";
import type { DeviceStatus } from "@/types";

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

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const d = await getDeviceApi(id);
        setDevice(d);
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
      await addRepairApi({ deviceId: device.id, status, comment: note || undefined });
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

          <form onSubmit={onUpdate} className="mt-4 flex flex-col md:flex-row gap-3 items-start">
            <select name="status" defaultValue={device.status} className="border rounded-md px-3 py-2 text-sm">
              {STATUS_OPTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <input name="note" placeholder="Nota (opcional)" className="flex-1 border rounded-md px-3 py-2 text-sm w-full" />
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
                <div className="text-slate-500 whitespace-nowrap">{new Date(h.date).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
