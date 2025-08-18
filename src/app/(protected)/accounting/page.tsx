"use client";

import { useEffect, useMemo, useState } from "react";
import { dailySummaryApi, createTransactionApi, deleteTransactionApi, setCashSessionApi, getCashSessionApi } from "@/services/api-accounting";
import { listProductsApi, sellProductApi } from "@/services/api-inventory";
import type { DailySummary, TransactionType, Transaction, Product } from "@/types";
import { formatCurrency } from "@/lib/format";
import { CalendarDays, ChevronLeft, ChevronRight, PlusCircle, Trash2 } from "lucide-react";

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function AccountingPage() {
  const [date, setDate] = useState<string>(todayISO());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [openingInput, setOpeningInput] = useState<string>("");
  const [savingOpening, setSavingOpening] = useState<boolean>(false);
  const [openingNotes, setOpeningNotes] = useState<string>("");

  const [type, setType] = useState<TransactionType>("income");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  // Sale state
  const [saleCategory, setSaleCategory] = useState<string>("");
  const [saleQuery, setSaleQuery] = useState<string>("");
  const [saleProducts, setSaleProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [saleQuantity, setSaleQuantity] = useState<string>("");
  const [saleUnitPrice, setSaleUnitPrice] = useState<string>("");
  const [saleNotes, setSaleNotes] = useState<string>("");
  const [saleLoading, setSaleLoading] = useState<boolean>(false);
  const [saleSaving, setSaleSaving] = useState<boolean>(false);
  const [saleCategories, setSaleCategories] = useState<string[]>([]);
  const [saleError, setSaleError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const s = await dailySummaryApi(date);
      setSummary(s);
    } catch (e: any) {
      setError(e?.message || "Error cargando resumen diario");
    } finally {
      setLoading(false);
    }

  }

  async function onSubmitSale(e: React.FormEvent) {
    e.preventDefault();
    setSaleError(null);
    const p = saleProducts.find((x) => x.id === selectedProductId);
    if (!p) { setSaleError("Seleccione un producto"); return; }
    const qty = Number(saleQuantity || 0);
    const price = Number(saleUnitPrice || 0);
    if (qty <= 0 || price < 0) { setSaleError("Cantidad o precio inválido"); return; }
    if (p.quantity < qty) { setSaleError("Stock insuficiente"); return; }
    try {
      setSaleSaving(true);
      await sellProductApi({ productId: p.id, quantity: qty, unitPrice: price, notes: saleNotes || undefined });
      setSelectedProductId("");
      setSaleQuantity("");
      setSaleUnitPrice("");
      setSaleNotes("");
      await Promise.all([load(), loadSaleProducts()]);
      alert("Venta registrada");
    } catch (e: any) {
      setSaleError(e?.message || "Error registrando venta");
    } finally {
      setSaleSaving(false);
    }
  }


  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [date]);
  useEffect(() => {
    setOpeningInput(summary?.openingBalance != null ? String(summary.openingBalance) : "");
  }, [summary]);
  useEffect(() => {
    (async () => {
      try {
        const cs = await getCashSessionApi(date);
        setOpeningNotes(cs?.notes || "");
      } catch {
        setOpeningNotes("");
      }
    })();
  }, [date]);

  async function loadSaleProducts() {
    try {
      setSaleLoading(true);
      const items = await listProductsApi({
        category: saleCategory || undefined,
        q: saleQuery || undefined,
        minQty: 1,
        limit: 100,
      });
      setSaleProducts(items);
    } catch (e) {
      // ignore
    } finally {
      setSaleLoading(false);
    }
  }

  useEffect(() => {
    // Initial load of sale products
    loadSaleProducts();
    (async () => {
      try {
        const items = await listProductsApi({ minQty: 1, limit: 200 });
        const cats = Array.from(new Set(items.map(i => (i.category || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
        setSaleCategories(cats);
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh list when category changes
  useEffect(() => { loadSaleProducts(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [saleCategory]);

  function shiftDay(days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    setDate(`${yyyy}-${mm}-${dd}`);
  }

  // Derived validation state for sale form
  const selectedSaleProduct = saleProducts.find((x) => x.id === selectedProductId);
  const saleQtyNum = Number(saleQuantity || 0);
  const salePriceNum = Number(saleUnitPrice || 0);
  const saleDisabled = saleSaving || !selectedSaleProduct || saleQtyNum <= 0 || salePriceNum < 0 || (selectedSaleProduct ? selectedSaleProduct.quantity < saleQtyNum : false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      await createTransactionApi({
        date,
        type,
        amount: Number(amount),
        description,
        category: category || undefined,
      });
      setAmount("");
      setDescription("");
      setCategory("");
      await load();
    } catch (e: any) {
      alert(e?.message || "Error guardando transacción");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("¿Eliminar transacción?")) return;
    try {
      await deleteTransactionApi(id);
      await load();
    } catch (e: any) {
      alert(e?.message || "Error eliminando transacción");
    }
  }

  const totals = useMemo(() => ({
    income: summary?.income || 0,
    expense: summary?.expense || 0,
    net: (summary?.income || 0) - (summary?.expense || 0),
    opening: summary?.openingBalance || 0,
    closing: summary?.closingBalance != null ? summary.closingBalance : ((summary?.openingBalance || 0) + ((summary?.income || 0) - (summary?.expense || 0))),
  }), [summary]);

  async function onSaveOpening(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSavingOpening(true);
      await setCashSessionApi({ date, openingBalance: Number(openingInput || 0), notes: openingNotes || undefined });
      await load();
    } catch (e: any) {
      alert(e?.message || "Error guardando apertura");
    } finally {
      setSavingOpening(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Contabilidad diaria</h1>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={() => shiftDay(-1)} className="p-2 rounded-md border bg-white hover:bg-slate-50" aria-label="Día anterior"><ChevronLeft className="h-4 w-4" /></button>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-slate-500" />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          />
        </div>
        <button onClick={() => shiftDay(1)} className="p-2 rounded-md border bg-white hover:bg-slate-50" aria-label="Día siguiente"><ChevronRight className="h-4 w-4" /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border">
          <div className="text-slate-500 text-sm">Apertura</div>
          <div className="text-2xl font-semibold">{formatCurrency(totals.opening)}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border">
          <div className="text-slate-500 text-sm">Ingresos</div>
          <div className="text-2xl font-semibold text-emerald-600">{formatCurrency(totals.income)}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border">
          <div className="text-slate-500 text-sm">Gastos</div>
          <div className="text-2xl font-semibold text-rose-600">{formatCurrency(totals.expense)}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border">
          <div className="text-slate-500 text-sm">Cierre</div>
          <div className="text-2xl font-semibold">{formatCurrency(totals.closing)}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4">
        <h2 className="font-medium mb-3">Apertura de caja</h2>
        <form onSubmit={onSaveOpening} className="flex flex-col md:flex-row items-start md:items-end gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Monto de apertura</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={openingInput}
              onChange={(e) => setOpeningInput(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div className="w-full md:w-auto">
            <label className="block text-xs text-slate-500 mb-1">Notas (opcional)</label>
            <input
              type="text"
              value={openingNotes}
              onChange={(e) => setOpeningNotes(e.target.value)}
              placeholder="Observaciones del turno"
              className="border rounded-md px-3 py-2 text-sm w-full md:w-80"
            />
          </div>
          <button type="submit" disabled={savingOpening} className="inline-flex items-center justify-center px-3 py-2 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50">
            Guardar apertura
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border p-4">
        <h2 className="font-medium mb-3">Registrar venta</h2>
        <form onSubmit={onSubmitSale} className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <select
            value={saleCategory}
            onChange={(e) => setSaleCategory(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          >
            <option value="">Todas las categorías</option>
            {saleCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Buscar producto (nombre, código)"
            value={saleQuery}
            onChange={(e) => setSaleQuery(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          />
          <button type="button" onClick={loadSaleProducts} className="px-3 py-2 rounded-md border bg-white hover:bg-slate-50 text-sm" disabled={saleLoading}>
            {saleLoading ? "Buscando…" : "Buscar"}
          </button>
          <select
            value={selectedProductId}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedProductId(id);
              const prod = saleProducts.find((x) => x.id === id);
              if (prod) setSaleUnitPrice(String(prod.price ?? ""));
            }}
            className="border rounded-md px-3 py-2 text-sm md:col-span-3"
            required
          >
            <option value="">Seleccione producto…</option>
            {saleProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · Stock: {p.quantity} · ${" "}{p.price.toFixed(2)}
              </option>
            ))}
          </select>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="Cantidad"
            value={saleQuantity}
            onChange={(e) => setSaleQuantity(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
            required
          />
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min={0}
            placeholder="Precio unitario"
            value={saleUnitPrice}
            onChange={(e) => setSaleUnitPrice(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
            required
          />
          <input
            type="text"
            placeholder="Notas (opcional)"
            value={saleNotes}
            onChange={(e) => setSaleNotes(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm md:col-span-2"
          />
          <button type="submit" disabled={saleDisabled} className="inline-flex items-center justify-center px-3 py-2 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50">
            Registrar venta
          </button>
          {saleError && (
            <div className="md:col-span-6 text-sm text-rose-600">{saleError}</div>
          )}
        </form>
      </div>

      <div className="bg-white rounded-xl border p-4">
        <h2 className="font-medium mb-3">Registrar transacción</h2>
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <select value={type} onChange={(e) => setType(e.target.value as TransactionType)} className="border rounded-md px-3 py-2 text-sm">
            <option value="income">Ingreso</option>
            <option value="expense">Gasto</option>
          </select>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="Monto"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
            required
          />
          <input
            type="text"
            placeholder="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm md:col-span-2"
            required
          />
          <input
            type="text"
            placeholder="Categoría (opcional)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          />
          <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
            <PlusCircle className="h-4 w-4" />
            <span>Guardar</span>
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left p-3">Hora</th>
              <th className="text-left p-3">Tipo</th>
              <th className="text-left p-3">Descripción</th>
              <th className="text-left p-3">Producto</th>
              <th className="text-right p-3">Cant.</th>
              <th className="text-right p-3">Monto</th>
              <th className="text-left p-3">Categoría</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} className="p-6 text-center text-slate-500">Cargando...</td></tr>
            )}
            {error && !loading && (
              <tr><td colSpan={8} className="p-6 text-center text-rose-600">{error}</td></tr>
            )}
            {!loading && !error && summary?.transactions.map((t: Transaction) => {
              const time = new Date(t.date).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
              return (
                <tr key={t.id} className="border-t">
                  <td className="p-3">{time}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${t.type === 'income' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{t.type === 'income' ? 'Ingreso' : 'Gasto'}</span>
                  </td>
                  <td className="p-3">{t.description}</td>
                  <td className="p-3">{t.productName || '-'}</td>
                  <td className="p-3 text-right">{t.quantity ?? '-'}</td>
                  <td className="p-3 text-right font-medium">{formatCurrency(t.amount)}</td>
                  <td className="p-3">{t.category || '-'}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => onDelete(t.id)} className="inline-flex items-center gap-1 px-2 py-1 rounded-md border hover:bg-slate-50" title="Eliminar">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {!loading && !error && (summary?.transactions.length ?? 0) === 0 && (
              <tr><td colSpan={8} className="p-6 text-center text-slate-500">Sin transacciones</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
