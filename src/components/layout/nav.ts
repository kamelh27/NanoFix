import { LayoutDashboard, Users, Wrench, Package, ReceiptText, Banknote, BarChart3, Settings } from "lucide-react";

export const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clientes", icon: Users },
  { href: "/devices", label: "Equipos", icon: Wrench },
  { href: "/inventory", label: "Inventario", icon: Package },
  { href: "/invoices", label: "Facturas", icon: ReceiptText },
  { href: "/accounting", label: "Contabilidad", icon: Banknote },
  { href: "/reports", label: "Reportes", icon: BarChart3 },
  { href: "/settings/branding", label: "Ajustes", icon: Settings },
];
