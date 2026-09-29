"use client";

import TransferList from "@/components/ui/Application/Admin/inventory/TransferList";

export default function ReceivedPage() {
  return <TransferList title="Received List" view="received" canConfirm />;
}
