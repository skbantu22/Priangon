// app/(root)/(admin)/admin/print/[id]/page.jsx

import PrintReceipt from "@/components/PrintReceipt";
import { loadPrintableOrder } from "@/lib/printableOrder";
import { invoicePath } from "@/lib/invoiceLink";

export default async function Page({ params }) {
  const { id } = await params;

  const order = await loadPrintableOrder(id);

  if (!order) {
    return <div className="p-6 text-center text-red-500">Order not found</div>;
  }

  return <PrintReceipt order={order} sharePath={invoicePath(order.orderNumber)} />;
}
