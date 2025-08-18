export const formatCurrency = (n: number, locale = "es-MX", currency = "MXN") =>
  new Intl.NumberFormat(locale, { style: "currency", currency }).format(n);

export const formatDate = (iso: string, locale?: string) => {
  const dt = new Date(iso);
  const loc = locale ?? (typeof navigator !== "undefined" ? navigator.language : "es-MX");
  try {
    return dt.toLocaleString(loc, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dt.toLocaleString("es-MX", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
};
