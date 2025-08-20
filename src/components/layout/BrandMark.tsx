"use client";

import { useEffect, useState, useCallback } from "react";
import { absoluteLogoUrl, getLogo, getBrandSettings } from "@/services/api-branding";

type Props = {
  height?: number;
  className?: string;
  textClassName?: string;
  alt?: string;
};

export default function BrandMark({
  height = 24,
  className = "",
  textClassName = "ml-2 text-sm font-semibold text-blue-700",
  alt = "Logo",
}: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [name, setName] = useState<string>("");

  const fetchData = useCallback(async () => {
    try {
      const [lr, br] = await Promise.all([getLogo(), getBrandSettings()]);
      setUrl(absoluteLogoUrl(lr.url));
      setName(br.name || "");
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await fetchData();
    })();
    const onUpdate = () => fetchData();
    window.addEventListener("branding-updated", onUpdate);
    return () => {
      mounted = false;
      window.removeEventListener("branding-updated", onUpdate);
    };
  }, [fetchData]);

  const hasLogo = Boolean(url);
  const displayText = name || (!hasLogo ? "NanoFix" : "");

  return (
    <span className={`inline-flex items-center ${className}`}>
      {hasLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url as string}
          alt={alt}
          style={{ height, width: "auto" }}
          crossOrigin="anonymous"
          onError={() => setUrl(null)}
        />
      ) : null}
      {displayText ? (
        <span className={hasLogo ? textClassName : textClassName.replace("ml-2", "")}>{displayText}</span>
      ) : null}
    </span>
  );
}
