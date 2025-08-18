"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  onDetected: (code: string) => void;
  onClose?: () => void;
}

export default function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const zxing = await import("@zxing/browser");
        const Reader = zxing.BrowserMultiFormatReader;
        const reader = new Reader();
        readerRef.current = reader;

        const devices = await Reader.listVideoInputDevices();
        const deviceId = devices?.[0]?.deviceId;
        if (!deviceId) {
          setError("No se encontró una cámara disponible");
          return;
        }

        await reader.decodeFromVideoDevice(deviceId, videoRef.current as HTMLVideoElement, (result: any, err: any) => {
          if (cancelled) return;
          if (result) {
            try { reader.reset(); } catch {}
            setActive(false);
            onDetected(result.getText());
            onClose?.();
          }
        });
      } catch (e: any) {
        setError(e?.message || "No se pudo iniciar el escáner");
      }
    })();
    return () => {
      cancelled = true;
      try { readerRef.current?.reset?.(); } catch {}
    };
  }, [onDetected, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-black rounded-xl overflow-hidden">
        <div className="absolute top-2 right-2 z-10">
          <button
            onClick={() => { onClose?.(); try { readerRef.current?.reset?.(); } catch {}; setActive(false); }}
            className="bg-white/90 text-sm px-3 py-1 rounded-md"
          >Cerrar</button>
        </div>
        {error ? (
          <div className="p-6 bg-white text-red-700 text-sm">{error}</div>
        ) : (
          <div className="relative aspect-[3/4]">
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline autoPlay />
            <div className="absolute inset-0 border-2 border-white/30 m-8 rounded-lg pointer-events-none" />
            <div className="absolute inset-x-10 top-1/2 h-0.5 bg-red-500 animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
}
