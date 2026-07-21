"use client";

import WhatsAppButton from "@/components/ui/WhatsAppButton";
import MessengerButton from "@/components/ui/MessengerButton";
import CrispChat from "@/components/ui/CrispChat";
import { usePathname } from "next/navigation";
import { USER_STOCK_CHECK } from "@/Route/Websiteroute";

export default function SupportChannels() {
  const pathname = usePathname();

  const hide =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith(USER_STOCK_CHECK); // স্টক চেকার পেজেও ফ্লোটিং বাটন হাইড থাকবে

  if (hide) return null;

  return (
    <>
      <WhatsAppButton />
      <MessengerButton />
      <CrispChat />
    </>
  );
}
