"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { listClientsApi } from "@/services/api-clients";
import { listDevicesByClientApi, UIDeviceBrief } from "@/services/api-devices";
import { createInvoiceApi } from "@/services/api-invoices";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";

const itemSchema = z.object({
  description: z.string().min(2),
  quantity: z.coerce.number().int().min(1),
  unitPrice: z.coerce.number().min(0),
});

const schema = z.object({
  clientId: z.string().min(1, "Selecciona un cliente"),
  deviceId: z.string().optional(),
  date: z.string(),
  items: z.array(itemSchema).min(1, "Agrega al menos un concepto"),
});

type FormInput = z.input<typeof schema>;
type FormData = z.output<typeof schema>;

export default function NewInvoicePage() {
  const router = useRouter();
  const params = useSearchParams();
  const preClientId = params.get("clientId") || "";
  const [clients, setClients] = useState<import("@/types").Client[]>([]);
  const [devices, setDevices] = useState<UIDeviceBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormInput, any, FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientId: preClientId,
      deviceId: "",
      date: new Date().toISOString().slice(0, 16),
      items: [{ description: "Diagnóstico", quantity: 1, unitPrice: 0 }],
    },
  });
  const { control, register, handleSubmit, watch, formState: { errors, isSubmitting } } = form;
  const { fields, append, remove } = useFieldArray<FormInput, "items">({ control, name: "items" });

  const selectedClient = watch("clientId");
  useEffect(() => {
    const boot = async () => {
      try {
        setLoading(true);
        const cs = await listClientsApi();
        setClients(cs);
        const clientId = preClientId || cs[0]?.id || "";
        if (clientId) form.setValue("clientId", clientId);
        if (clientId) {
          const ds = await listDevicesByClientApi(clientId);
          setDevices(ds);
        }
        setError(null);
      } catch (e: any) {
        setError(e?.message || "Error cargando datos");
      } finally {
        setLoading(false);
      }
    };
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchDevices = async () => {
      if (!selectedClient) { setDevices([]); return; }
      try {
        const ds = await listDevicesByClientApi(selectedClient);
        setDevices(ds);
      } catch (e) {
        // ignore per-change errors in device list
      }
    };
    fetchDevices();
  }, [selectedClient]);

  const items = watch("items");
  const total = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);

  const onSubmit = async (data: FormData) => {
    try {
      await createInvoiceApi({
        client: data.clientId,
        device: data.deviceId || undefined,
        items: data.items.map((it) => ({ description: it.description, quantity: Number(it.quantity), unitPrice: Number(it.unitPrice) })),
      });
      router.replace("/invoices");
    } catch (e: any) {
      alert(e?.message || "No se pudo crear la factura");
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold">Nueva factura</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white p-4 rounded-xl border">
        {loading && <div className="p-2 text-slate-500">Cargando...</div>}
        {error && !loading && <div className="p-2 text-red-600">{error}</div>}
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm mb-1">Cliente</label>
            <select {...register("clientId")} className="w-full border rounded-md px-3 py-2 text-sm">
              <option value="">Selecciona</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.clientId && <p className="text-xs text-red-600 mt-1">{errors.clientId.message}</p>}
          </div>
          <div>
            <label className="block text-sm mb-1">Equipo (opcional)</label>
            <select {...register("deviceId")} className="w-full border rounded-md px-3 py-2 text-sm">
              <option value="">—</option>
              {devices.map(d => <option key={d.id} value={d.id}>{d.brand} {d.model}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Fecha</label>
            <input type="datetime-local" {...register("date")} className="w-full border rounded-md px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-medium">Conceptos</h2>
            <button type="button" onClick={() => append({ description: "", quantity: 1, unitPrice: 0 })} className="text-sm border px-3 py-1.5 rounded-md">Agregar</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left p-2">Descripción</th>
                  <th className="text-left p-2">Cant.</th>
                  <th className="text-left p-2">Precio</th>
                  <th className="text-left p-2">Subtotal</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {fields.map((f, idx) => {
                  const qty = Number(items[idx]?.quantity || 0);
                  const price = Number(items[idx]?.unitPrice || 0);
                  return (
                    <tr key={f.id} className="border-t">
                      <td className="p-2">
                        <input {...register(`items.${idx}.description` as const)} className="w-full border rounded-md px-2 py-1.5" />
                        {errors.items?.[idx]?.description && <p className="text-xs text-red-600 mt-1">{errors.items[idx]?.description?.message as string}</p>}
                      </td>
                      <td className="p-2">
                        <input type="number" {...register(`items.${idx}.quantity` as const)} className="w-24 border rounded-md px-2 py-1.5" />
                      </td>
                      <td className="p-2">
                        <input type="number" step="0.01" {...register(`items.${idx}.unitPrice` as const)} className="w-28 border rounded-md px-2 py-1.5" />
                      </td>
                      <td className="p-2 font-medium">{formatCurrency(qty * price)}</td>
                      <td className="p-2 text-right">
                        <button type="button" onClick={() => remove(idx)} className="text-xs border px-2 py-1 rounded-md">Quitar</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {errors.items && <p className="text-xs text-red-600 mt-1">{errors.items.message as string}</p>}
        </div>

        <div className="flex items-center justify-end gap-4">
          <div className="text-sm text-slate-500">Total</div>
          <div className="text-xl font-semibold">{formatCurrency(total)}</div>
        </div>

        <div className="flex gap-2">
          <button disabled={isSubmitting} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">Guardar</button>
          <Link href="/invoices" className="px-4 py-2 rounded-md text-sm border">Cancelar</Link>
        </div>
      </form>
    </div>
  );
}
