"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchInvoicesDetailed, deleteInvoiceApi } from "@/services/api-invoices";
import { ReceiptText, Plus, Trash2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";

export default function InvoicesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Array<{ invoice: import("@/types").Invoice; client?: any }>>([]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchInvoicesDetailed();
      setRows(data);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Error cargando facturas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onDelete = async (id: string) => {
    if (!confirm("¿Eliminar factura?")) return;
    await deleteInvoiceApi(id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold flex items-center gap-2"><ReceiptText className="h-6 w-6 text-blue-700"/> Facturas</h1>
        <div className="flex items-center gap-2">
          <Link href="/invoices/income" className="inline-flex items-center gap-2 border text-sm px-3 py-2 rounded-md hover:bg-slate-50">
            Ingresos
          </Link>
          <Link href="/invoices/new" className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm px-3 py-2 rounded-md hover:bg-blue-700">
            <Plus className="h-4 w-4"/> Nueva factura
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {loading && <div className="p-6 text-center text-slate-500">Cargando...</div>}
        {error && !loading && <div className="p-6 text-center text-red-600">{error}</div>}
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left p-3">Fecha</th>
              <th className="text-left p-3">Cliente</th>
              <th className="text-left p-3">Total</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ invoice: i, client }) => (
              <tr key={i.id} className="border-t">
                <td className="p-3">{formatDate(i.date)}</td>
                <td className="p-3">{client?.name || "Cliente"}</td>
                <td className="p-3 font-medium">{formatCurrency(i.total)}</td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/invoices/${i.id}`} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border hover:bg-slate-50">Ver</Link>
                    <button onClick={() => onDelete(i.id)} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border text-red-700 hover:bg-red-50"><Trash2 className="h-3 w-3"/> Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && !error && rows.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-slate-500">Sin facturas</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
