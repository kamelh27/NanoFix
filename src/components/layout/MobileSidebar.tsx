"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { nav } from "./nav";
import BrandMark from "./BrandMark";
import Cookies from "js-cookie";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function MobileSidebar({ open, onClose }: Props) {
  const pathname = usePathname();
  const role = (Cookies.get("user_role") as "admin" | "technician" | undefined) || "admin";
  const items = role === "admin" ? nav : nav.filter((n) => n.href === "/devices");

  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-white shadow-xl flex flex-col">
        <div className="h-16 flex items-center justify-between px-4 border-b">
          <BrandMark height={24} />
          <button aria-label="Cerrar" onClick={onClose} className="p-2 rounded hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 p-2 overflow-y-auto">
          <ul className="space-y-1">
            {items.map((item) => {
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
      </div>
    </div>
  );
}
