"use client";

import { usePathname } from "next/navigation";
import SupportWidget from "@/components/ui/Application/SupportWidget";
import { USER_STOCK_CHECK } from "@/Route/Websiteroute";

// one support widget (Call / WhatsApp) instead of separate chat bubbles
export default function SupportChannels() {
  const pathname = usePathname();

  const hide =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/invoice") ||
    pathname.startsWith(USER_STOCK_CHECK); // স্টক চেকার পেজেও ফ্লোটিং বাটন হাইড থাকবে

  if (hide) return null;

  return <SupportWidget />;
}
