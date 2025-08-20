"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Cookies from "js-cookie";

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = Cookies.get("auth_token");
    const role = Cookies.get("user_role");

    if (!token) {
      const from = encodeURIComponent(pathname || "/dashboard");
      router.replace(`/login?from=${from}`);
      return;
    }

    if (role === "technician") {
      // Allow /devices list and device detail pages only
      const isDevices = pathname.startsWith("/devices");
      const isNewDevice = pathname === "/devices/new" || pathname.startsWith("/devices/new/");
      const allowed = isDevices && !isNewDevice;
      if (!allowed) {
        router.replace("/devices");
        return;
      }
    }

    setReady(true);
  }, [pathname, router]);

  if (!ready) return null;
  return <>{children}</>;
}
