"use client";

import { useParams } from "next/navigation";

import PurchaseOrderForm from "@/components/ui/Application/Admin/purchase/PurchaseOrderForm";

export default function EditPurchaseOrderPage() {
  const { id } = useParams();

  return <PurchaseOrderForm id={id} />;
}
