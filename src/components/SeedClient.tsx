"use client";

import { useEffect } from "react";
import { seedIfEmpty } from "@/lib/seed";

export default function SeedClient() {
  useEffect(() => {
    seedIfEmpty();
  }, []);
  return null;
}
