"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listDevicesApi } from "@/services/api-devices";
import { Wrench, Plus } from "lucide-react";
import type { DeviceStatus } from "@/types";

const TABS: { key: DeviceStatus | "todos"; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "en_reparacion", label: "En reparación" },
  { key: "reparado", label: "Reparado" },
  { key: "entregado", label: "Entregado" },
];

export default function DevicesPage() {
  const [tab, setTab] = useState<DeviceStatus | "todos">("todos");
  const [devices, setDevices] = useState<Array<{ id: string; clientId: string; clientName?: string; brand: string; model: string; issue?: string; status: DeviceStatus }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await listDevicesApi();
        setDevices(data);
      } catch (e: any) {
        setError(e?.message || "Error cargando equipos");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = devices.filter((d) => (tab === "todos" ? true : d.status === tab));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold flex items-center gap-2"><Wrench className="h-6 w-6 text-blue-700"/> Equipos</h1>
        <Link href="/devices/new" className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm px-3 py-2 rounded-md hover:bg-blue-700">
          <Plus className="h-4 w-4"/> Nuevo equipo
        </Link>
      </div>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-sm px-3 py-1.5 rounded-md border ${tab === t.key ? "bg-blue-50 text-blue-700 border-blue-200" : "hover:bg-slate-50"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left p-3">Equipo</th>
              <th className="text-left p-3">Problema</th>
              <th className="text-left p-3">Cliente</th>
              <th className="text-left p-3">Estado</th>
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
            {!loading && !error && filtered.map((d) => (
              <tr key={d.id} className="border-t">
                <td className="p-3 font-medium">{d.brand} {d.model}</td>
                <td className="p-3">{d.issue}</td>
                <td className="p-3">{d.clientName || "Cliente"}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-1 rounded-full border ${
                    d.status === "en_reparacion" ? "bg-blue-50 text-blue-700 border-blue-100" :
                    d.status === "reparado" ? "bg-amber-50 text-amber-700 border-amber-100" :
                    "bg-green-50 text-green-700 border-green-100"
                  }`}>
                    {d.status.replace("_", " ")}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/devices/${d.id}`} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border hover:bg-slate-50">Ver</Link>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && !error && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">Sin equipos</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
