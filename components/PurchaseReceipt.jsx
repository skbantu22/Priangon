"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";
import { methodLabel } from "@/components/ui/Application/Admin/supplier/supplierKit";
import { amountInWords, money } from "@/components/InvoiceSheet";

const cell = "border border-black px-2 py-1.5 align-top text-[#111] text-[13px]";
const headCell = `${cell} bg-[#f4f4f5] font-bold align-middle text-center`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatBillDate(value) {
  const date = value ? new Date(value) : new Date();
  const day = String(date.getDate()).padStart(2, "0");
  return `${day} - ${MONTHS[date.getMonth()]} - ${date.getFullYear()}`;
}

function formatCreatedAt(value) {
  const date = value ? new Date(value) : new Date();
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${formatBillDate(date)} : ${h}:${m}:${s}`;
}

function tk(value) {
  return `TK ${money(value)}`;
}

function wordsForBill(value) {
  const raw = amountInWords(value).replace(/\s*Taka\s*/i, " ").trim();
  return raw.endsWith("Only") ? raw : `${raw} Only`;
}

function QtyCell({ qty, unit = "Pcs" }) {
  return (
    <div className="text-center leading-tight">
      <div>{qty}</div>
      <div className="text-[11px] font-normal">{unit}</div>
    </div>
  );
}

function InfoLine({ label, value }) {
  return (
    <p className="text-[13px] leading-5">
      <span className="font-semibold">{label}</span>
      {value ? ` ${value}` : ""}
    </p>
  );
}

/**
 * AmarSolution-style purchase bill — white paper, no admin chrome when opened from the list.
 */
export default function PurchaseReceipt({ purchase, company = {}, autoPrint = false, toolbarStart = null }) {
  useEffect(() => {
    if (!autoPrint) return undefined;
    const timer = setTimeout(() => window.print(), 500);
    return () => clearTimeout(timer);
  }, [autoPrint]);

  if (!purchase) return <div className="p-4 text-center">Loading...</div>;

  const supplier = purchase.supplierId && typeof purchase.supplierId === "object" ? purchase.supplierId : {};
  const shopName = company.name || "Shop";
  const shopAddress = company.address || "";
  const shopPhone = company.phone || "";
  const shopEmail = company.email || "";
  const shopLogo = company.logo || "";

  const items = purchase.items || [];
  const payments = purchase.payments || [];

  const subtotal = Number(purchase.subtotal || purchase.grandTotal || 0);
  const totalAmount = Number(purchase.grandTotal || 0);
  const totalPaid = Number(purchase.paidAmount || 0);
  const dueAmount = Number(purchase.dueAmount || 0);

  const totalQty = items.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 0), 0);
  const totalExtraQty = items.reduce((sum, item) => sum + (parseInt(item.extraQty, 10) || 0), 0);
  const totalLineDiscount = items.reduce((sum, item) => sum + Number(item.discount || 0), 0);

  const lineTotal = (item) => Number(item.total ?? Number(item.unitPrice || 0) * (parseInt(item.quantity, 10) || 1));

  const itemLabel = (item) => {
    const name = item.productName || "Item";
    const code = item.barcode || item.sku;
    return code ? `${name} (${code})` : name;
  };

  const paymentRows =
    payments.length > 0
      ? payments
      : [{ method: "cash", createdBy: "", amount: 0, reference: "" }];

  return (
    <div className="mx-auto w-full max-w-[900px]">
      {toolbarStart ? <div className="print:hidden mb-4 flex flex-wrap justify-center gap-2">{toolbarStart}</div> : null}

      <div
        id="invoice-print"
        className="bg-white px-6 py-7 text-[13px] leading-snug text-[#111] shadow-[0_1px_8px_rgba(0,0,0,0.12)] print:p-0 print:shadow-none"
        style={{ background: "#ffffff", color: "#111111" }}
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            {shopLogo ? (
              <img src={shopLogo} alt="" className="mb-2 h-14 max-w-[220px] object-contain object-left" />
            ) : null}
            <h1 className="text-[20px] font-bold leading-tight text-[#188ae2]">{shopName}</h1>
            {shopAddress ? <p className="mt-2 text-[13px] leading-5">Address: {shopAddress}</p> : null}
            {shopPhone ? <p className="text-[13px] leading-5">Mobile: {shopPhone}</p> : null}
            {shopEmail ? <p className="text-[13px] leading-5">Email: {shopEmail}</p> : null}
          </div>

          <div className="shrink-0 sm:min-w-[280px]">
            <p className="text-[15px] font-semibold">Purchase</p>
            <InfoLine label="Invoice No :" value={purchase.purchaseNumber} />
            <InfoLine label="Date :" value={formatBillDate(purchase.purchaseDate)} />
            <p className="mt-3 text-[13px] font-semibold">Billing To</p>
            <InfoLine label="Name:" value={supplier.name || purchase.supplierName || ""} />
            <InfoLine label="Business Name:" value={supplier.companyName || ""} />
            <InfoLine label="Address:" value={supplier.address || ""} />
            <InfoLine label="Mobile:" value={supplier.phone || ""} />
            <InfoLine label="Email:" value={supplier.email || ""} />
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse">
            <thead>
              <tr>
                <th className={`${headCell} w-[6%]`}>SL.</th>
                <th className={`${headCell} text-left`}>Item</th>
                <th className={`${headCell} w-[11%]`}>Total Qty</th>
                <th className={`${headCell} w-[11%]`}>Extra Qty</th>
                <th className={`${headCell} w-[12%]`}>Rate</th>
                <th className={`${headCell} w-[12%]`}>Discount</th>
                <th className={`${headCell} w-[12%]`}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td className={`${cell} text-center align-middle`}>{index + 1}</td>
                  <td className={cell}>{itemLabel(item)}</td>
                  <td className={`${cell} align-middle`}>
                    <QtyCell qty={item.quantity ?? 0} />
                  </td>
                  <td className={`${cell} align-middle`}>
                    <QtyCell qty={item.extraQty ?? 0} />
                  </td>
                  <td className={`${cell} text-right tabular-nums align-middle`}>{money(item.unitPrice)}</td>
                  <td className={`${cell} text-right tabular-nums align-middle`}>{money(item.discount)}</td>
                  <td className={`${cell} text-right tabular-nums align-middle font-semibold`}>{money(lineTotal(item))}</td>
                </tr>
              ))}
              <tr>
                <td className={cell} />
                <td className={cell} />
                <td className={`${cell} align-middle font-semibold`}>
                  <QtyCell qty={totalQty} />
                </td>
                <td className={`${cell} align-middle font-semibold`}>
                  <QtyCell qty={totalExtraQty} />
                </td>
                <td className={cell} />
                <td className={`${cell} text-right tabular-nums align-middle font-semibold`}>{money(totalLineDiscount)}</td>
                <td className={cell} />
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-[480px] text-[13px] font-semibold leading-5">In Words: {wordsForBill(totalAmount)}</p>

          <table className="w-full max-w-[280px] shrink-0 border-collapse text-[13px] sm:ml-auto">
            <tbody>
              <tr>
                <td className={`${cell} font-semibold`}>Subtotal</td>
                <td className={`${cell} text-right tabular-nums`}>{tk(subtotal)}</td>
              </tr>
              <tr>
                <td className={`${cell} text-[15px] font-bold`}>Total</td>
                <td className={`${cell} text-right text-[15px] font-bold tabular-nums`}>{tk(totalAmount)}</td>
              </tr>
              <tr>
                <td className={`${cell} font-semibold`}>Paid</td>
                <td className={`${cell} text-right tabular-nums`}>{tk(totalPaid)}</td>
              </tr>
              <tr>
                <td className={`${cell} font-semibold`}>Due</td>
                <td className={`${cell} text-right tabular-nums font-semibold`}>{tk(dueAmount)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-5">
          <p className="mb-1 text-[13px] font-semibold">Payment Details</p>
          <table className="w-full max-w-[520px] border-collapse text-[13px]">
            <thead>
              <tr>
                <th className={`${headCell} w-[8%]`}>Sl</th>
                <th className={`${headCell} text-left`}>Payment Method</th>
                <th className={`${headCell} text-left`}>Payment By</th>
                <th className={`${headCell} w-[22%]`}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {paymentRows.map((pay, index) => (
                <tr key={pay._id || index}>
                  <td className={`${cell} text-center align-middle`}>{index + 1}</td>
                  <td className={`${cell} align-middle`}>{methodLabel(pay.method)}</td>
                  <td className={`${cell} align-middle`}>
                    {typeof pay.createdBy === "string" && pay.createdBy.trim() ? pay.createdBy.trim() : "-"}
                  </td>
                  <td className={`${cell} text-right tabular-nums align-middle`}>{money(pay.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {purchase.note ? (
          <p className="mt-4 text-[13px] leading-5">
            <span className="font-bold">Note: </span>
            {purchase.note}
          </p>
        ) : null}

        <p className="mt-10 text-center text-[11px] text-[#888]">Created at : {formatCreatedAt(purchase.createdAt)}</p>
      </div>

      <div className="print:hidden mt-5 flex justify-center">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded bg-[#188ae2] px-5 py-2.5 text-[14px] font-medium text-white shadow-sm transition hover:bg-[#1576c4]"
        >
          <Printer className="h-4 w-4" aria-hidden />
          Print
        </button>
      </div>
    </div>
  );
}
