"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { fetchInvoice, deleteInvoiceApi, serverPdfUrl } from "@/services/api-invoices";
import { formatCurrency, formatDate } from "@/lib/format";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import Cookies from "js-cookie";
import { getLogo, absoluteLogoUrl, getBrandSettings } from "@/services/api-branding";

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<import("@/types").Invoice | null>(null);
  const [client, setClient] = useState<any>(null);
  const [device, setDevice] = useState<any>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [brandName, setBrandName] = useState<string>("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchInvoice(id);
        if (!active) return;
        setInvoice(data.invoice);
        setClient(data.client);
        setDevice(data.device);
        setError(null);
      } catch (e: any) {
        setError(e?.message || "Error cargando factura");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  // Fetch branding logo and name for display/print
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [resLogo, resSettings] = await Promise.all([getLogo(), getBrandSettings()]);
        if (!active) return;
        setLogoUrl(absoluteLogoUrl(resLogo.url));
        setBrandName(resSettings?.name || "");
      } catch {}
    })();
    return () => { active = false; };
  }, []);

  // Listen for live branding updates (from settings page) and refresh logo/name
  useEffect(() => {
    const onBrandingUpdated = async () => {
      try {
        const [resLogo, resSettings] = await Promise.all([getLogo(), getBrandSettings()]);
        setLogoUrl(absoluteLogoUrl(resLogo.url));
        setBrandName(resSettings?.name || "");
      } catch {}
    };
    window.addEventListener("branding-updated", onBrandingUpdated);
    return () => {
      window.removeEventListener("branding-updated", onBrandingUpdated);
    };
  }, []);

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (error || !invoice) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">{error || "Factura no encontrada"}</h1>
        <Link href="/invoices" className="text-blue-700 hover:underline">Volver a facturas</Link>
      </div>
    );
  }

  const subtotal = invoice.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const total = subtotal; // taxes/discounts could be added later

  const onDelete = async () => {
    if (!confirm("¿Eliminar factura?")) return;
    await deleteInvoiceApi(invoice.id);
    router.replace("/invoices");
  };

  // Open server-generated PDF with Authorization header
  const openServerPdf = async (invId: string) => {
    const url = serverPdfUrl(invId);
    const token = Cookies.get("auth_token");
    try {
      if (!token) throw new Error("No token provided");
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/pdf",
        },
        credentials: "include",
      });
      if (!res.ok) {
        const ct = res.headers.get("content-type") || "";
        let msg = `HTTP ${res.status}`;
        try {
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
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const w = window.open(blobUrl, "_blank");
      if (!w) {
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `factura_${invId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (e: any) {
      alert(`Error abriendo PDF del servidor: ${e?.message || e}`);
    }
  };

  // Helpers to improve reliability of capture
  const waitForFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  const isCanvasBlank = (cnv: HTMLCanvasElement) => {
    try {
      const w = 32, h = 32;
      const tmp = document.createElement("canvas");
      tmp.width = w; tmp.height = h;
      const tctx = tmp.getContext("2d");
      if (!tctx) return false;
      tctx.fillStyle = "#ffffff"; tctx.fillRect(0, 0, w, h);
      tctx.drawImage(cnv, 0, 0, w, h);
      const data = tctx.getImageData(0, 0, w, h).data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        if (!(a === 255 && r === 255 && g === 255 && b === 255)) {
          return false; // found a non-white pixel
        }
      }
      return true;
    } catch {
      return false;
    }
  };

  const onExportPDF = async () => {
    if (!contentRef.current && !printRef.current) return;
    try {
      // Attempt 1: capture the hidden inline-styled container (most reliable)
      let canvas: HTMLCanvasElement | null = null;
      try {
        if (!printRef.current) throw new Error("no-print-ref");
        await waitForFrame();
        const node = printRef.current;
        const prev = {
          left: node.style.left,
          top: node.style.top,
          opacity: node.style.opacity,
          pointerEvents: node.style.pointerEvents,
        };
        node.style.left = "0px";
        node.style.top = "0px";
        node.style.opacity = "0";
        node.style.pointerEvents = "none";
        await waitForFrame();
        try { await (document as any).fonts?.ready; } catch {}
        const hiddenTextLen = (node.textContent?.trim().length || 0);
        const sw = node.scrollWidth; const sh = node.scrollHeight;
        console.debug("PDF export: hidden text length=", hiddenTextLen, "size=", node.offsetWidth, node.offsetHeight, "scroll=", sw, sh);
        if (hiddenTextLen === 0) throw new Error("no-text-content-hidden");
        canvas = await html2canvas(node, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          foreignObjectRendering: false,
          width: sw,
          height: sh,
          scrollX: 0,
          scrollY: 0,
        });
        node.style.left = prev.left;
        node.style.top = prev.top;
        node.style.opacity = prev.opacity;
        node.style.pointerEvents = prev.pointerEvents;
        if (canvas.width < 2 || canvas.height < 2) throw new Error("empty-canvas-hidden");
        if (isCanvasBlank(canvas)) throw new Error("blank-canvas-hidden");
      } catch (e) {
        // Attempt 2: try hidden container again using foreignObjectRendering for better fidelity
        try {
          if (!printRef.current) throw e;
          await waitForFrame();
          const node2 = printRef.current;
          const prev2 = {
            left: node2.style.left,
            top: node2.style.top,
            opacity: node2.style.opacity,
            pointerEvents: node2.style.pointerEvents,
          };
          node2.style.left = "0px";
          node2.style.top = "0px";
          node2.style.opacity = "0";
          node2.style.pointerEvents = "none";
          await waitForFrame();
          try { await (document as any).fonts?.ready; } catch {}
          const sw2 = node2.scrollWidth; const sh2 = node2.scrollHeight;
          const hidden2TextLen = (node2.textContent?.trim().length || 0);
          console.debug("PDF export: hidden(FO) text length=", hidden2TextLen, "scroll=", sw2, sh2);
          if (hidden2TextLen === 0) throw new Error("no-text-content-hidden-fo");
          canvas = await html2canvas(node2, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
            foreignObjectRendering: true,
            width: sw2,
            height: sh2,
            scrollX: 0,
            scrollY: 0,
          });
          node2.style.left = prev2.left;
          node2.style.top = prev2.top;
          node2.style.opacity = prev2.opacity;
          node2.style.pointerEvents = prev2.pointerEvents;
          if (canvas.width < 2 || canvas.height < 2) throw new Error("empty-canvas-hidden-fo");
          if (isCanvasBlank(canvas)) throw new Error("blank-canvas-hidden-fo");
        } catch (e2) {
          // Attempt 3: capture the visible Tailwind-styled container, with a sanitized cloned DOM
          if (!contentRef.current) throw e2;
          await waitForFrame();
          const target = contentRef.current!;
          try { await (document as any).fonts?.ready; } catch {}
          const visibleTextLen = (target.textContent?.trim().length || 0);
          console.debug("PDF export: visible text length=", visibleTextLen, "size=", target.offsetWidth, target.offsetHeight);
          if (visibleTextLen === 0) throw new Error("no-text-content-visible");
          canvas = await html2canvas(target, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
            foreignObjectRendering: false,
            onclone: (doc) => {
              const keep = doc.getElementById("invoice-print");
              if (keep) {
                const body = doc.body;
                Array.from(body.children).forEach((child) => {
                  if (child !== keep) body.removeChild(child);
                });
                body.style.background = "#ffffff";
              }
              const style = doc.createElement("style");
              style.textContent = `
                html, body { background: #ffffff !important; color: #111827 !important; }
                * { background-image: none !important; box-shadow: none !important; text-shadow: none !important; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #e5e7eb; }
              `;
              doc.head.appendChild(style);
              [
                "#nextjs-container-build-error",
                "#nextjs-container-errors",
                "#nextjs-toast",
                "[data-nextjs-toast]",
              ].forEach((sel) => doc.querySelectorAll(sel).forEach((n) => n.remove()));
            },
          });
          if (canvas.width < 2 || canvas.height < 2) throw new Error("empty-canvas");
          if (isCanvasBlank(canvas)) throw new Error("blank-canvas");
        }
      }

      if (!canvas) throw new Error("canvas-null");
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 48 * 2; // 48pt margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let y = 48;
      if (imgHeight < pageHeight - 96) {
        pdf.addImage(imgData, "PNG", 48, y, imgWidth, imgHeight);
      } else {
        // Split into pages
        let remaining = imgHeight;
        const pageCanvas = document.createElement("canvas");
        const pageCtx = pageCanvas.getContext("2d")!;
        const ratio = imgWidth / canvas.width;
        const sliceHeight = (pageHeight - 96) / ratio; // area we can place per page in canvas pixels
        let position = 0;
        while (remaining > 0) {
          const currentSlice = Math.min(sliceHeight, canvas.height - position);
          pageCanvas.width = canvas.width;
          pageCanvas.height = currentSlice;
          pageCtx.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
          pageCtx.drawImage(canvas, 0, position, canvas.width, currentSlice, 0, 0, canvas.width, currentSlice);
          const pageImg = pageCanvas.toDataURL("image/png");
          if (position > 0) pdf.addPage();
          pdf.addImage(pageImg, "PNG", 48, 48, imgWidth, (currentSlice * imgWidth) / canvas.width);
          position += currentSlice;
          remaining -= currentSlice;
        }
      }

      pdf.save(`factura_${invoice.id}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
      // Fallback: open server-generated PDF to ensure user can still export
      alert("No se pudo generar el PDF en el navegador. Intentando abrir el PDF del servidor...");
      openServerPdf(invoice.id);
    }
  };

  const onServerPDF = () => {
    openServerPdf(invoice.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Factura</h1>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button onClick={onExportPDF} className="text-sm border px-3 py-2 rounded-md hover:bg-slate-50">Exportar PDF</button>
          <button onClick={onServerPDF} className="text-sm border px-3 py-2 rounded-md hover:bg-slate-50">PDF (Servidor)</button>
          <button onClick={onDelete} className="text-sm border px-3 py-2 rounded-md text-red-700 hover:bg-red-50">Eliminar</button>
          <Link href="/invoices" className="text-sm border px-3 py-2 rounded-md">Volver</Link>
        </div>
      </div>

      <div ref={contentRef} id="invoice-print" className="bg-white rounded-xl border p-6 text-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div>
            <div className="flex items-center gap-3">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo" className="h-7 w-auto" crossOrigin="anonymous" />
              ) : null}
              <div className="text-xl font-semibold text-blue-700">{brandName || "NanoFix"}</div>
            </div>
            <div className="text-slate-600">Taller de reparación</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Folio</div>
            <div className="text-lg font-semibold">{invoice.id}</div>
            <div className="mt-2 text-xs text-slate-500">Fecha</div>
            <div className="font-medium">{formatDate(invoice.date)}</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <div>
            <div className="text-xs text-slate-500">Cliente</div>
            <div className="font-medium">{client?.name}</div>
            {client?.phone && <div className="text-slate-600">{client.phone}</div>}
            {client?.email && <div className="text-slate-600">{client.email}</div>}
          </div>
          {device && (
            <div>
              <div className="text-xs text-slate-500">Equipo</div>
              <div className="font-medium">{device.brand} {device.model}</div>
              <div className="text-slate-600">{device.issue}</div>
            </div>
          )}
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left p-2">Descripción</th>
                <th className="text-left p-2">Cantidad</th>
                <th className="text-left p-2">Precio</th>
                <th className="text-left p-2">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((it, idx) => (
                <tr key={`${it.description}-${idx}`} className="border-t">
                  <td className="p-2">{it.description}</td>
                  <td className="p-2">{it.quantity}</td>
                  <td className="p-2">{formatCurrency(it.unitPrice)}</td>
                  <td className="p-2 font-medium">{formatCurrency(it.quantity * it.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-x-8 gap-y-2">
          <div className="text-slate-500">Subtotal</div>
          <div className="font-semibold">{formatCurrency(subtotal)}</div>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-end gap-x-8 gap-y-2">
          <div className="text-slate-500">Total</div>
          <div className="text-xl font-bold">{formatCurrency(total)}</div>
        </div>
      </div>

      {/* Hidden, inline-styled print container to ensure html2canvas captures content without external CSS */}
      <div
        ref={printRef}
        id="invoice-print-hidden"
        style={{
          position: "absolute",
          left: "0",
          top: "0",
          background: "#ffffff",
          color: "#111827",
          padding: "24px",
          width: "794px",
          fontSize: "12px",
          lineHeight: 1.5,
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          opacity: 0 as unknown as number,
          pointerEvents: "none" as unknown as any,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: "24px" }}>
          <div>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo" style={{ height: "28px", width: "auto" }} crossOrigin="anonymous" />
            ) : null}
            <div style={{ display: "inline-block", marginLeft: logoUrl ? "8px" : 0, fontSize: "18px", fontWeight: 600, color: "#1d4ed8" }}>
              {brandName || "NanoFix"}
            </div>
            <div style={{ color: "#475569" }}>Taller de reparación</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "10px", color: "#64748b" }}>Folio</div>
            <div style={{ fontSize: "16px", fontWeight: 600 }}>{invoice.id}</div>
            <div style={{ marginTop: "8px", fontSize: "10px", color: "#64748b" }}>Fecha</div>
            <div style={{ fontWeight: 500 }}>{formatDate(invoice.date)}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "24px" }}>
          <div>
            <div style={{ fontSize: "10px", color: "#64748b" }}>Cliente</div>
            <div style={{ fontWeight: 600 }}>{client?.name}</div>
            {client?.phone ? <div style={{ color: "#475569" }}>{client.phone}</div> : null}
            {client?.email ? <div style={{ color: "#475569" }}>{client.email}</div> : null}
          </div>
          {device ? (
            <div>
              <div style={{ fontSize: "10px", color: "#64748b" }}>Equipo</div>
              <div style={{ fontWeight: 600 }}>{device.brand} {device.model}</div>
              {device.issue ? <div style={{ color: "#475569" }}>{device.issue}</div> : null}
            </div>
          ) : null}
        </div>

        <div style={{ marginTop: "24px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", color: "#475569" }}>
                <th style={{ textAlign: "left", padding: "8px", border: "1px solid #e5e7eb" }}>Descripción</th>
                <th style={{ textAlign: "left", padding: "8px", border: "1px solid #e5e7eb" }}>Cantidad</th>
                <th style={{ textAlign: "left", padding: "8px", border: "1px solid #e5e7eb" }}>Precio</th>
                <th style={{ textAlign: "left", padding: "8px", border: "1px solid #e5e7eb" }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((it, idx) => (
                <tr key={`${it.description}-${idx}`}>
                  <td style={{ padding: "8px", border: "1px solid #e5e7eb" }}>{it.description}</td>
                  <td style={{ padding: "8px", border: "1px solid #e5e7eb" }}>{it.quantity}</td>
                  <td style={{ padding: "8px", border: "1px solid #e5e7eb" }}>{formatCurrency(it.unitPrice)}</td>
                  <td style={{ padding: "8px", border: "1px solid #e5e7eb", fontWeight: 600 }}>
                    {formatCurrency(it.quantity * it.unitPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", gap: "32px" }}>
          <div style={{ color: "#64748b" }}>Subtotal</div>
          <div style={{ fontWeight: 700 }}>{formatCurrency(subtotal)}</div>
        </div>
        <div style={{ marginTop: "8px", display: "flex", justifyContent: "flex-end", gap: "32px" }}>
          <div style={{ color: "#64748b" }}>Total</div>
          <div style={{ fontSize: "16px", fontWeight: 800 }}>{formatCurrency(total)}</div>
        </div>
      </div>

    </div>
  );
}
