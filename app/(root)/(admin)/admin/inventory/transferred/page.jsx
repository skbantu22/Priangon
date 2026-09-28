"use client";

import TransferList from "@/components/ui/Application/Admin/inventory/TransferList";
import { ADMIN_INVENTORY_TRANSFERRED } from "@/Route/Adminpannelroute";

export default function TransferredPage() {
  return <TransferList title="Transferred List" href={ADMIN_INVENTORY_TRANSFERRED} />;
}
