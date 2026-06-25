"use client";

import WhatsAppButton from "@/components/ui/WhatsAppButton";
import MessengerButton from "@/components/ui/MessengerButton";
import CrispChat from "@/components/ui/CrispChat";
import { usePathname } from "next/navigation";

export default function SupportChannels() {
  const pathname = usePathname();

  const hide =
    pathname.startsWith("/admin") || pathname.startsWith("/dashboard");

  if (hide) return null;

  return (
    <>
      <WhatsAppButton />
      <MessengerButton />
      <CrispChat />
    </>
  );
}
