"use client";

import { useEffect, useState } from "react";
import BrandMark from "@/components/layout/BrandMark";
import { absoluteLogoUrl, getLogo, uploadLogo, getBrandSettings, updateBrandSettings } from "@/services/api-branding";
import { Upload, Image as ImageIcon } from "lucide-react";

export default function BrandingSettingsPage() {
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [brandName, setBrandName] = useState<string>("");
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<string | null>(null);
  const [nameErr, setNameErr] = useState<string | null>(null);

  useEffect(() => {
    getLogo()
      .then((r) => setCurrentUrl(absoluteLogoUrl(r.url)))
      .catch(() => {});
    getBrandSettings()
      .then((r) => setBrandName(r.name || ""))
      .catch(() => {});
  }, []);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setError(null);
    setMessage(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await uploadLogo(file);
      const abs = absoluteLogoUrl(res.url);
      setCurrentUrl(abs);
      setFile(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      setMessage("Logo actualizado correctamente");
      try { window.dispatchEvent(new Event("branding-updated")); } catch {}
    } catch (err: any) {
      setError(err?.message || "Error subiendo logo");
    } finally {
      setSaving(false);
    }
  }

  async function onSaveName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    setNameMsg(null);
    setNameErr(null);
    try {
      const r = await updateBrandSettings(brandName.trim() ? brandName.trim() : null);
      setBrandName(r.name || "");
      setNameMsg("Nombre guardado");
      try { window.dispatchEvent(new Event("branding-updated")); } catch {}
    } catch (err: any) {
      setNameErr(err?.message || "Error guardando nombre");
    } finally {
      setSavingName(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Marca y Logo</h1>
        <p className="text-sm text-slate-600">Sube un logo para personalizar la aplicación.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white border rounded-xl p-4">
          <h2 className="font-medium mb-3">Logo actual</h2>
          <div className="h-24 flex items-center justify-center border rounded-md bg-slate-50">
            {currentUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={currentUrl} alt="Logo actual" className="max-h-20 w-auto" />
            ) : (
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <ImageIcon className="h-4 w-4" />
                Sin logo. Se mostrará el texto "NanoFix".
              </div>
            )}
          </div>
        </div>

        <form onSubmit={onSubmit} className="bg-white border rounded-xl p-4 space-y-3">
          <h2 className="font-medium">Subir nuevo logo</h2>
          <input
            type="file"
            accept="image/*"
            onChange={onPick}
            className="block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-md file:border file:bg-white hover:file:bg-slate-50"
          />
          {preview && (
            <div className="h-24 flex items-center justify-center border rounded-md bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Vista previa" className="max-h-20 w-auto" />
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={!file || saving}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-white hover:bg-slate-50 disabled:opacity-50 text-sm"
            >
              <Upload className="h-4 w-4" />
              {saving ? "Guardando..." : "Guardar logo"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (preview) URL.revokeObjectURL(preview);
                setFile(null);
                setPreview(null);
              }}
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              Cancelar
            </button>
          </div>
          {message && <div className="text-sm text-green-700">{message}</div>}
          {error && <div className="text-sm text-rose-600">{error}</div>}
        </form>
      </div>

      <form onSubmit={onSaveName} className="bg-white border rounded-xl p-4 space-y-3 max-w-xl">
        <h2 className="font-medium">Nombre de la marca</h2>
        <p className="text-sm text-slate-600">Este nombre se mostrará junto al logo en las facturas.</p>
        <input
          type="text"
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
          placeholder="Ej. NanoFix"
          className="block w-full border rounded-md px-3 py-2 text-sm"
        />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={savingName}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-white hover:bg-slate-50 disabled:opacity-50 text-sm"
          >
            {savingName ? "Guardando..." : "Guardar nombre"}
          </button>
          {nameMsg && <div className="text-sm text-green-700">{nameMsg}</div>}
          {nameErr && <div className="text-sm text-rose-600">{nameErr}</div>}
        </div>
      </form>

      <div className="bg-white border rounded-xl p-4">
        <h2 className="font-medium mb-2">Vista en barra superior</h2>
        <div className="h-16 flex items-center px-3 border rounded-md">
          <BrandMark height={22} />
        </div>
        <p className="text-xs text-slate-500 mt-2">El logo se muestra en la barra superior (móvil) y en la barra lateral (escritorio).</p>
      </div>
    </div>
  );
}
