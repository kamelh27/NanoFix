"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { fetchInvoicesDetailed, incomeBetweenApi } from "@/services/api-invoices";
import { formatCurrency, formatDate } from "@/lib/format";

function startOfMonthISO(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0).toISOString().slice(0, 16);
}

export default function IncomePage() {
  const [from, setFrom] = useState(startOfMonthISO());
  const [to, setTo] = useState(new Date().toISOString().slice(0, 16));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Array<{ invoice: import("@/types").Invoice; client?: any }>>([]);
  const [total, setTotal] = useState(0);

  const inRange = useMemo(() => {
    const fromISO = new Date(from).toISOString();
    const toISO = new Date(to).toISOString();
    return rows
      .filter(({ invoice }) => invoice.date >= fromISO && invoice.date <= toISO)
      .sort((a, b) => a.invoice.date.localeCompare(b.invoice.date));
  }, [rows, from, to]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [list, tot] = await Promise.all([
          fetchInvoicesDetailed(),
          incomeBetweenApi(new Date(from), new Date(to)),
        ]);
        setRows(list);
        setTotal(tot);
        setError(null);
      } catch (e: any) {
        setError(e?.message || "Error cargando ingresos");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const refreshTotal = async () => {
      try {
        const tot = await incomeBetweenApi(new Date(from), new Date(to));
        setTotal(tot);
      } catch {}
    };
    refreshTotal();
  }, [from, to]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Ingresos por fecha</h1>
        <Link href="/invoices" className="text-sm border px-3 py-2 rounded-md">Volver</Link>
      </div>

      <div className="bg-white rounded-xl border p-4">
        <form className="grid md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-sm mb-1">Desde</label>
            <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm mb-1">Hasta</label>
            <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm" />
          </div>
          <div className="md:col-span-2 flex flex-wrap items-center gap-x-4 gap-y-2 md:justify-end">
            <div className="text-slate-500">Total</div>
            <div className="text-2xl font-bold">{formatCurrency(total)}</div>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {loading && <div className="p-6 text-center text-slate-500">Cargando...</div>}
        {error && !loading && <div className="p-6 text-center text-red-600">{error}</div>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left p-3">Fecha</th>
                <th className="text-left p-3">Cliente</th>
                <th className="text-left p-3">Total</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {inRange.map(({ invoice, client }) => (
                <tr key={invoice.id} className="border-t">
                  <td className="p-3">{formatDate(invoice.date)}</td>
                  <td className="p-3">{client?.name || "Cliente"}</td>
                  <td className="p-3 font-medium">{formatCurrency(invoice.total)}</td>
                  <td className="p-3 text-right">
                    <Link href={`/invoices/${invoice.id}`} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border hover:bg-slate-50">Ver</Link>
                  </td>
                </tr>
              ))}
              {!loading && !error && inRange.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-500">Sin resultados en el rango</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
