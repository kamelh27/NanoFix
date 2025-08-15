"use client";

import { useParams, useRouter } from "next/navigation";
import { getClientApi, updateClientApi, deleteClientApi } from "@/services/api-clients";
import { listDevicesByClientApi } from "@/services/api-devices";
import { fetchInvoices } from "@/services/api-invoices";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/format";

export default function EditClientPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<{ id: string; name: string; phone: string; email?: string } | null>(null);
  const [devices, setDevices] = useState<Array<{ id: string; brand: string; model: string; issue?: string }>>([]);
  const [invoices, setInvoices] = useState<Array<{ id: string; total: number; date: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [c, devs, invs] = await Promise.all([
          getClientApi(id),
          listDevicesByClientApi(id),
          fetchInvoices(),
        ]);
        setClient(c);
        setDevices(devs.map((d) => ({ id: d.id, brand: d.brand, model: d.model, issue: d.issue })));
        setInvoices(invs.filter((i) => i.clientId === id).map((i) => ({ id: i.id, total: i.total, date: i.date })));
      } catch (e: any) {
        setError(e?.message || "No se pudo cargar el cliente");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <div className="p-4 text-slate-500">Cargando…</div>;

  if (error) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Error</h1>
        <p className="text-red-700 text-sm">{error}</p>
        <Link href="/clients" className="text-blue-700 hover:underline">Volver a clientes</Link>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Cliente no encontrado</h1>
        <Link href="/clients" className="text-blue-700 hover:underline">Volver a clientes</Link>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      const updated = await updateClientApi(client.id, {
        name: String(form.get("name") || client.name),
        phone: String(form.get("phone") || client.phone),
        email: (String(form.get("email") || "") || undefined) as string | undefined,
      });
      setClient(updated);
    } catch (e: any) {
      alert(e?.message || "No se pudo actualizar");
    }
  };

  const onDelete = async () => {
    if (!confirm("¿Eliminar cliente? Esta acción no se puede deshacer.")) return;
    try {
      await deleteClientApi(client.id);
      router.replace("/clients");
    } catch (e: any) {
      alert(e?.message || "No se pudo eliminar");
    }
  };

  // devices and invoices already loaded from API

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Editar cliente</h1>
        <button onClick={onDelete} className="text-sm border px-3 py-2 rounded-md text-red-700 hover:bg-red-50">Eliminar</button>
      </div>

      <form onSubmit={onSubmit} className="bg-white p-4 rounded-xl border max-w-lg space-y-4">
        <div>
          <label className="block text-sm mb-1">Nombre</label>
          <input name="name" defaultValue={client.name} className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm mb-1">Teléfono</label>
          <input name="phone" defaultValue={client.phone} className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm mb-1">Correo</label>
          <input name="email" defaultValue={client.email || ""} className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <div className="flex gap-2">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">Guardar</button>
          <Link href="/clients" className="px-4 py-2 rounded-md text-sm border">Volver</Link>
        </div>
      </form>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium">Equipos</h2>
            <Link href={`/devices/new?clientId=${client.id}`} className="text-sm text-blue-700 hover:underline">Agregar equipo</Link>
          </div>
          <ul className="divide-y text-sm">
            {devices.map((d) => (
              <li key={d.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="font-medium">{d.brand} {d.model}</div>
                  <div className="text-slate-500">{d.issue}</div>
                </div>
                <Link className="text-blue-700 hover:underline" href={`/devices/${d.id}`}>Ver</Link>
              </li>
            ))}
            {devices.length === 0 && <li className="py-4 text-slate-500">Sin equipos</li>}
          </ul>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium">Facturas</h2>
            <Link href={`/invoices/new?clientId=${client.id}`} className="text-sm text-blue-700 hover:underline">Nueva factura</Link>
          </div>
          <ul className="divide-y text-sm">
            {invoices.map((i) => (
              <li key={i.id} className="py-2 flex items-center justify-between">
                <div>{formatDate(i.date)}</div>
                <div className="font-medium">{formatCurrency(i.total)}</div>
                <Link className="text-blue-700 hover:underline" href={`/invoices/${i.id}`}>Ver</Link>
              </li>
            ))}
            {invoices.length === 0 && <li className="py-4 text-slate-500">Sin facturas</li>}
          </ul>
        </div>
      </section>
    </div>
  );
}
