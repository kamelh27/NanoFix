"use client";

import { useEffect, useState } from "react";
import { absoluteLogoUrl, getLogo } from "@/services/api-branding";

type Props = {
  height?: number;
  className?: string;
  alt?: string;
  fallbackTextClassName?: string;
};

export default function BrandLogo({ height = 28, className = "", alt = "Logo", fallbackTextClassName = "font-semibold text-blue-700" }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getLogo()
      .then((res) => {
        if (!mounted) return;
        setUrl(absoluteLogoUrl(res.url));
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  if (!url) {
    return <span className={fallbackTextClassName}>NanoFix</span>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      style={{ height, width: "auto" }}
      className={className}
      onError={() => setUrl(null)}
    />
  );
}
