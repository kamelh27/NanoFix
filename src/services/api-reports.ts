import { apiGet, apiUrl } from "@/lib/api";
import type { ReportSummaryRow, TopProductRow, ExpensesByCategoryRow } from "@/types";

export async function summaryApi(from: Date, to: Date, granularity: "day" | "week" | "month" = "day"): Promise<ReportSummaryRow[]> {
  const q = new URLSearchParams({ from: from.toISOString(), to: to.toISOString(), granularity });
  const data = await apiGet<{ from: string; to: string; granularity: string; rows: ReportSummaryRow[] }>(`/api/reports/summary?${q.toString()}`);
  return data.rows;
}

export async function topProductsApi(from: Date, to: Date, opts?: { sortBy?: "quantity" | "value"; limit?: number }): Promise<TopProductRow[]> {
  const q = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
  if (opts?.sortBy) q.set("sortBy", opts.sortBy);
  if (opts?.limit) q.set("limit", String(opts.limit));
  const data = await apiGet<{ from: string; to: string; sortBy: string; rows: TopProductRow[] }>(`/api/reports/top-products?${q.toString()}`);
  return data.rows;
}

export async function expensesByCategoryApi(from: Date, to: Date): Promise<{ total: number; rows: ExpensesByCategoryRow[] }> {
  const q = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
  const data = await apiGet<{ from: string; to: string; total: number; rows: ExpensesByCategoryRow[] }>(`/api/reports/expenses-by-category?${q.toString()}`);
  return { total: data.total, rows: data.rows };
}

export const reportExportUrls = {
  summaryCsv(from: Date, to: Date, granularity: "day" | "week" | "month" = "day") {
    const q = new URLSearchParams({ from: from.toISOString(), to: to.toISOString(), granularity });
    return apiUrl(`/api/reports/summary.csv?${q.toString()}`);
  },
  summaryPdf(from: Date, to: Date, granularity: "day" | "week" | "month" = "day") {
    const q = new URLSearchParams({ from: from.toISOString(), to: to.toISOString(), granularity });
    return apiUrl(`/api/reports/summary.pdf?${q.toString()}`);
  },
  topProductsCsv(from: Date, to: Date, sortBy: "quantity" | "value" = "quantity", limit = 10) {
    const q = new URLSearchParams({ from: from.toISOString(), to: to.toISOString(), sortBy, limit: String(limit) });
    return apiUrl(`/api/reports/top-products.csv?${q.toString()}`);
  },
  expensesCsv(from: Date, to: Date) {
    const q = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
    return apiUrl(`/api/reports/expenses-by-category.csv?${q.toString()}`);
  },
};
