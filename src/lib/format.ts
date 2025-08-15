export const formatCurrency = (n: number, locale = "es-MX", currency = "MXN") =>
  new Intl.NumberFormat(locale, { style: "currency", currency }).format(n);

export const formatDate = (iso: string, locale = "es-MX") =>
  new Date(iso).toLocaleString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
