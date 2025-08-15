"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listClientsApi, deleteClientApi } from "@/services/api-clients";
import { Users, Plus, Pencil, Trash2, Phone, Mail } from "lucide-react";

export default function ClientsPage() {
  const [clients, setClients] = useState<Array<{ id: string; name: string; phone: string; email?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
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
  }

  useEffect(() => { load(); }, []);

  const onDelete = async (id: string) => {
    if (!confirm("¿Eliminar cliente?")) return;
    try {
      await deleteClientApi(id);
      setClients((prev) => prev.filter((c) => c.id !== id));
    } catch (e: any) {
      alert(e?.message || "No se pudo eliminar");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold flex items-center gap-2"><Users className="h-6 w-6 text-blue-700"/> Clientes</h1>
        <Link href="/clients/new" className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm px-3 py-2 rounded-md hover:bg-blue-700">
          <Plus className="h-4 w-4"/> Nuevo
        </Link>
      </div>
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left p-3">Nombre</th>
              <th className="text-left p-3">Teléfono</th>
              <th className="text-left p-3">Correo</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-slate-500">Cargando…</td>
              </tr>
            )}
            {error && !loading && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-red-700">{error}</td>
              </tr>
            )}
            {!loading && !error && clients.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3"><span className="inline-flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400"/>{c.phone}</span></td>
                <td className="p-3"><span className="inline-flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400"/>{c.email || "—"}</span></td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/clients/${c.id}`} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border hover:bg-slate-50"><Pencil className="h-3 w-3"/> Editar</Link>
                    <button onClick={() => onDelete(c.id)} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border text-red-700 hover:bg-red-50"><Trash2 className="h-3 w-3"/> Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && !error && clients.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-slate-500">Sin clientes aún</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
