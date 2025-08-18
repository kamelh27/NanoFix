"use client";

import { useEffect, useState } from "react";
import { summaryApi, topProductsApi, expensesByCategoryApi, reportExportUrls } from "@/services/api-reports";
import type { ReportSummaryRow, TopProductRow, ExpensesByCategoryRow } from "@/types";
import { formatCurrency } from "@/lib/format";
import { CalendarRange, RefreshCcw, Download } from "lucide-react";
import Cookies from "js-cookie";

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23,59,59,999); return x; }
function startOfMonth(d: Date) { const x = new Date(d.getFullYear(), d.getMonth(), 1); x.setHours(0,0,0,0); return x; }
function endOfMonth(d: Date) { const x = new Date(d.getFullYear(), d.getMonth()+1, 0); x.setHours(23,59,59,999); return x; }
function startOfWeek(d: Date) { const x = startOfDay(d); const dow = x.getDay(); const diff = (dow + 6) % 7; x.setDate(x.getDate() - diff); return x; } // Monday
function endOfWeek(d: Date) { const x = startOfWeek(d); x.setDate(x.getDate() + 6); x.setHours(23,59,59,999); return x; }

export default function ReportsPage() {
  const now = new Date();
  const [from, setFrom] = useState<Date>(startOfWeek(now));
  const [to, setTo] = useState<Date>(endOfWeek(now));
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("day");
  const [sortBy, setSortBy] = useState<"quantity" | "value">("quantity");
  const [limit, setLimit] = useState<number>(10);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<ReportSummaryRow[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductRow[]>([]);
  const [expenses, setExpenses] = useState<ExpensesByCategoryRow[]>([]);
  const [expensesTotal, setExpensesTotal] = useState<number>(0);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const [s, tp, ex] = await Promise.all([
        summaryApi(from, to, granularity),
        topProductsApi(from, to, { sortBy, limit }),
        expensesByCategoryApi(from, to),
      ]);
      setSummary(s);
      setTopProducts(tp);
      setExpenses(ex.rows);
      setExpensesTotal(ex.total);
    } catch (e: any) {
      setError(e?.message || "Error cargando reportes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // --- Authenticated file download/open helpers (fixes "No token provided") ---
  async function fetchWithAuth(url: string, accept: string): Promise<Blob> {
    const token = Cookies.get("auth_token");
    if (!token) throw new Error("No token provided");
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: accept,
      },
      credentials: "include",
    });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          const data = await res.json();
          if (data?.message) msg = data.message;
        } else {
          const t = await res.text();
          if (t) msg = t;
        }
      } catch {}
      throw new Error(msg);
    }
    return await res.blob();
  }

  function downloadBlob(blob: Blob, filename: string) {
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  }

  async function openPdfWithAuth(url: string, fallbackName: string) {
    try {
      const blob = await fetchWithAuth(url, "application/pdf");
      const blobUrl = URL.createObjectURL(blob);
      const w = window.open(blobUrl, "_blank");
      if (!w) downloadBlob(blob, fallbackName);
      else setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (e: any) {
      alert(e?.message || String(e));
    }
  }

  async function downloadCsvWithAuth(url: string, filename: string) {
    try {
      const blob = await fetchWithAuth(url, "text/csv");
      downloadBlob(blob, filename);
    } catch (e: any) {
      alert(e?.message || String(e));
    }
  }

  const fmt = (d: Date) => d.toISOString().slice(0,10);

  function applyPreset(preset: "today" | "week" | "month") {
    const d = new Date();
    if (preset === "today") { setFrom(startOfDay(d)); setTo(endOfDay(d)); setGranularity("day"); }
    if (preset === "week") { setFrom(startOfWeek(d)); setTo(endOfWeek(d)); setGranularity("day"); }
    if (preset === "month") { setFrom(startOfMonth(d)); setTo(endOfMonth(d)); setGranularity("day"); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Reportes financieros</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => applyPreset("today")} className="px-3 py-2 border rounded-md bg-white hover:bg-slate-50 text-sm">Hoy</button>
          <button onClick={() => applyPreset("week")} className="px-3 py-2 border rounded-md bg-white hover:bg-slate-50 text-sm">Esta semana</button>
          <button onClick={() => applyPreset("month")} className="px-3 py-2 border rounded-md bg-white hover:bg-slate-50 text-sm">Este mes</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-slate-500" />
          <input type="date" value={from.toISOString().slice(0,10)} onChange={(e) => setFrom(new Date(e.target.value))} className="border rounded-md px-3 py-2 text-sm" />
          <span className="text-slate-500">a</span>
          <input type="date" value={to.toISOString().slice(0,10)} onChange={(e) => setTo(new Date(e.target.value))} className="border rounded-md px-3 py-2 text-sm" />
        </div>
        <select value={granularity} onChange={(e) => setGranularity(e.target.value as any)} className="border rounded-md px-3 py-2 text-sm">
          <option value="day">Día</option>
          <option value="week">Semana</option>
          <option value="month">Mes</option>
        </select>
        <div className="flex items-center gap-2">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="border rounded-md px-3 py-2 text-sm">
            <option value="quantity">Más vendidos (cantidad)</option>
            <option value="value">Más vendidos (valor)</option>
          </select>
          <input type="number" min={1} max={100} value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="border rounded-md px-3 py-2 text-sm w-20" />
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-white hover:bg-slate-50 text-sm"><RefreshCcw className="h-4 w-4" /> Actualizar</button>
      </div>

      {error && <div className="p-4 border rounded-xl bg-rose-50 text-rose-700">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-3 flex items-center justify-between border-b">
            <h2 className="font-medium">Resumen ({granularity})</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => downloadCsvWithAuth(reportExportUrls.summaryCsv(from, to, granularity), `summary_${granularity}_${fmt(from)}_${fmt(to)}.csv`)} className="inline-flex items-center gap-1 px-2 py-1 border rounded-md text-sm"><Download className="h-4 w-4" /> CSV</button>
              <button onClick={() => openPdfWithAuth(reportExportUrls.summaryPdf(from, to, granularity), `summary_${granularity}_${fmt(from)}_${fmt(to)}.pdf`)} className="inline-flex items-center gap-1 px-2 py-1 border rounded-md text-sm"><Download className="h-4 w-4" /> PDF</button>
            </div>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left p-3">Bucket</th>
                <th className="text-right p-3">Ingresos</th>
                <th className="text-right p-3">Gastos</th>
                <th className="text-right p-3">Neto</th>
              </tr>
            </thead>
            <tbody>
              {loading && (<tr><td colSpan={4} className="p-6 text-center text-slate-500">Cargando...</td></tr>)}
              {!loading && summary.map((r) => (
                <tr key={r.bucket} className="border-t">
                  <td className="p-3">{r.bucket}</td>
                  <td className="p-3 text-right">{formatCurrency(r.income)}</td>
                  <td className="p-3 text-right">{formatCurrency(r.expense)}</td>
                  <td className="p-3 text-right font-medium">{formatCurrency(r.net)}</td>
                </tr>
              ))}
              {!loading && summary.length === 0 && (<tr><td colSpan={4} className="p-6 text-center text-slate-500">Sin datos</td></tr>)}
            </tbody>
          </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-3 flex items-center justify-between border-b">
            <h2 className="font-medium">Productos más vendidos</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => downloadCsvWithAuth(reportExportUrls.topProductsCsv(from, to, sortBy, limit), `top_products_${sortBy}_${fmt(from)}_${fmt(to)}.csv`)} className="inline-flex items-center gap-1 px-2 py-1 border rounded-md text-sm"><Download className="h-4 w-4" /> CSV</button>
            </div>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left p-3">Producto</th>
                <th className="text-right p-3">Cantidad</th>
                <th className="text-right p-3">Valor</th>
              </tr>
            </thead>
            <tbody>
              {loading && (<tr><td colSpan={3} className="p-6 text-center text-slate-500">Cargando...</td></tr>)}
              {!loading && topProducts.map((r, idx) => (
                <tr key={`${r.name}-${idx}`} className="border-t">
                  <td className="p-3">{r.name}</td>
                  <td className="p-3 text-right">{r.quantity}</td>
                  <td className="p-3 text-right font-medium">{formatCurrency(r.value)}</td>
                </tr>
              ))}
              {!loading && topProducts.length === 0 && (<tr><td colSpan={3} className="p-6 text-center text-slate-500">Sin datos</td></tr>)}
            </tbody>
          </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border overflow-hidden md:col-span-2">
          <div className="p-3 flex items-center justify-between border-b">
            <h2 className="font-medium">Gastos por categoría</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => downloadCsvWithAuth(reportExportUrls.expensesCsv(from, to), `expenses_by_category_${fmt(from)}_${fmt(to)}.csv`)} className="inline-flex items-center gap-1 px-2 py-1 border rounded-md text-sm"><Download className="h-4 w-4" /> CSV</button>
            </div>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left p-3">Categoría</th>
                <th className="text-right p-3">Total</th>
                <th className="text-right p-3">% del total</th>
              </tr>
            </thead>
            <tbody>
              {loading && (<tr><td colSpan={3} className="p-6 text-center text-slate-500">Cargando...</td></tr>)}
              {!loading && expenses.map((r, idx) => (
                <tr key={`${r.category}-${idx}`} className="border-t">
                  <td className="p-3">{r.category}</td>
                  <td className="p-3 text-right">{formatCurrency(r.total)}</td>
                  <td className="p-3 text-right">{expensesTotal ? ((r.total / expensesTotal) * 100).toFixed(1) + '%' : '-'}</td>
                </tr>
              ))}
              {!loading && expenses.length === 0 && (<tr><td colSpan={3} className="p-6 text-center text-slate-500">Sin datos</td></tr>)}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
}
