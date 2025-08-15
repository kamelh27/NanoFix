"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Wrench,
  Package,
  ReceiptText,
} from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clientes", icon: Users },
  { href: "/devices", label: "Equipos", icon: Wrench },
  { href: "/inventory", label: "Inventario", icon: Package },
  { href: "/invoices", label: "Facturas", icon: ReceiptText },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:flex-col w-64 shrink-0 border-r bg-white/80 backdrop-blur">
      <div className="h-16 flex items-center px-6 border-b">
        <Link href="/dashboard" className="font-semibold text-blue-700">
          NanoFix
        </Link>
      </div>
      <nav className="flex-1 p-2">
        <ul className="space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    active
                      ? "bg-blue-50 text-blue-700 border border-blue-100"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-4 text-xs text-slate-500">© {new Date().getFullYear()} NanoFix</div>
    </aside>
  );
}
