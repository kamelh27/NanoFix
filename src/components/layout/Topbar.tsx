"use client";

import { useState } from "react";
import { LogOut, Search, Menu } from "lucide-react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import BrandMark from "./BrandMark";
import MobileSidebar from "./MobileSidebar";

export default function Topbar() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const onLogout = () => {
    Cookies.remove("auth_token");
    Cookies.remove("user_role");
    router.replace("/login");
  };
  return (
    <>
      <header className="h-16 border-b bg-white/70 backdrop-blur flex items-center gap-3 px-3 md:px-4">
        <button
          aria-label="Menu"
          className="md:hidden p-2 rounded hover:bg-slate-100"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="md:hidden">
          <BrandMark height={22} />
        </div>

        <div className="hidden md:flex items-center">
          <BrandMark height={24} />
        </div>

        <div className="relative hidden md:block">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            placeholder="Buscar..."
            className="pl-8 pr-3 py-2 rounded-md border text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md border hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" />
            Salir
          </button>
        </div>
      </header>
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
