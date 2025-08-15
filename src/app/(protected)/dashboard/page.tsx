"use client";

import { useEffect, useState } from "react";
import { fetchDashboardSummary } from "@/services/api-dashboard";
import { formatCurrency } from "@/lib/format";
import { Activity, FileText, PackageMinus, ReceiptText } from "lucide-react";

type Summary = Awaited<ReturnType<typeof fetchDashboardSummary>>;

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchDashboardSummary();
      setSummary(data);
    } catch (e: any) {
      setError(e?.message || "No se pudo cargar el panel");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Panel de control</h1>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KPI title="Reparaciones activas" value={summary?.activeRepairs ?? (loading ? "…" : 0)} icon={<Activity className="h-5 w-5 text-blue-700" />} />
        <KPI title="Inventario bajo" value={summary ? summary.lowInventory.length : (loading ? "…" : 0)} icon={<PackageMinus className="h-5 w-5 text-amber-700" />} />
        <KPI title="Facturas recientes" value={summary ? summary.recentInvoices.length : (loading ? "…" : 0)} icon={<FileText className="h-5 w-5 text-slate-700" />} />
        <KPI title="Ingresos (30 días)" value={summary ? formatCurrency(summary.incomeLast30Days) : (loading ? "…" : formatCurrency(0))} icon={<ReceiptText className="h-5 w-5 text-slate-700" />} />
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <div className="bg-white rounded-xl border p-4">
          <h2 className="font-medium mb-3">Inventario bajo</h2>
          <ul className="divide-y">
            {loading && <li className="py-4 text-sm text-slate-500">Cargando…</li>}
            {error && !loading && <li className="py-4 text-sm text-red-700">{error}</li>}
            {!loading && !error && summary?.lowInventory.slice(0, 6).map((p) => (
              <li key={p.id} className="py-2 text-sm flex items-center justify-between">
                <div className="truncate">
                  <div className="font-medium truncate">{p.name}</div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full border bg-amber-50 text-amber-700 border-amber-100">{p.quantity}</span>
              </li>
            ))}
            {!loading && !error && summary && summary.lowInventory.length === 0 && (
              <li className="py-4 text-sm text-slate-500">Sin alertas</li>
            )}
          </ul>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <h2 className="font-medium mb-3">Últimas facturas</h2>
          <ul className="divide-y">
            {loading && <li className="py-4 text-sm text-slate-500">Cargando…</li>}
            {error && !loading && <li className="py-4 text-sm text-red-700">{error}</li>}
            {!loading && !error && summary?.recentInvoices.slice(0, 6).map((i) => (
              <li key={i.id} className="py-2 text-sm flex items-center justify-between">
                <div className="truncate">{new Date(i.date).toLocaleDateString()}</div>
                <div className="font-medium">{formatCurrency(i.total)}</div>
              </li>
            ))}
            {!loading && !error && summary && summary.recentInvoices.length === 0 && (
              <li className="py-4 text-sm text-slate-500">Sin facturas recientes</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function KPI({ title, value, icon }: { title: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-slate-500">{title}</div>
          <div className="text-2xl font-semibold mt-1">{value}</div>
        </div>
        <div className="p-2 rounded-md bg-slate-50 border">{icon}</div>
      </div>
    </div>
  );
}
