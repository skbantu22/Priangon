import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PrintReceipt from "@/components/PrintReceipt";
import { getPartner } from "@/lib/partner.server";
import { loadPrintableOrder } from "@/lib/printableOrder";

// A partner can only open invoices of their own customer account
export default async function PartnerInvoice({ params }) {
  const { id } = await params;
  const partner = await getPartner();
  const order = partner
    ? await loadPrintableOrder(id, { customerId: partner.customer._id })
    : null;

  return (
    <div className="space-y-4">
      <Link href="/partner/orders?tab=invoices" className="inline-flex items-center gap-1 text-sm font-semibold text-primary print:hidden">
        <ArrowLeft className="size-4" /> Back to invoices
      </Link>
      {order ? (
        <div className="rounded-2xl border bg-white py-4">
          <PrintReceipt order={order} autoPrint={false} />
        </div>
      ) : (
        <p className="py-20 text-center text-muted-foreground">Invoice not found.</p>
      )}
    </div>
  );
}
