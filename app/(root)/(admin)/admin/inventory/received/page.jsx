"use client";

import TransferList from "@/components/ui/Application/Admin/inventory/TransferList";
import { ADMIN_INVENTORY_RECEIVED } from "@/Route/Adminpannelroute";

export default function ReceivedPage() {
  return (
    <TransferList title="Received List" href={ADMIN_INVENTORY_RECEIVED} canReceive />
  );
}
