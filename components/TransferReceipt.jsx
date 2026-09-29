"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";

const cell = "border border-black px-2 py-1.5 align-top text-[#111] text-[13px]";
const headCell = `${cell} bg-[#f4f4f5] font-bold align-middle text-center`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatBillDate(value) {
  const date = value ? new Date(value) : new Date();
  const day = String(date.getDate()).padStart(2, "0");
  return `${day} - ${MONTHS[date.getMonth()]} - ${date.getFullYear()}`;
}

function InfoLine({ label, value }) {
  return (
    <p className="text-[13px] leading-5">
      <span className="font-semibold">{label}</span>
      {value ? ` ${value}` : ""}
    </p>
  );
}

const STATUS_LABEL = { pending: "Pending", received: "Confirmed", rejected: "Rejected" };

/**
 * Simple stock transfer bill — opens from the list without admin chrome.
 */
export default function TransferReceipt({
  transfer,
  company = {},
  autoPrint = false,
  toolbarStart = null,
}) {
  useEffect(() => {
    if (!autoPrint) return undefined;
    const timer = setTimeout(() => window.print(), 500);
    return () => clearTimeout(timer);
  }, [autoPrint]);

  if (!transfer) return <div className="p-4 text-center">Loading...</div>;

  const shopName = company.name || "Shop";
  const shopLogo = company.logo || "";
  const items = transfer.items || [];
  const totalQty =
    Number(transfer.totalQuantity) ||
    items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const statusText = STATUS_LABEL[transfer.status] || transfer.status;

  return (
    <div className="mx-auto w-full max-w-[860px]">
      {toolbarStart ? (
        <div className="print:hidden mb-4 flex flex-wrap justify-center gap-2">{toolbarStart}</div>
      ) : null}

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
            <p className="mt-3 text-[15px] font-semibold">Stock Transfer</p>
          </div>

          <div className="shrink-0 sm:min-w-[260px]">
            <InfoLine label="Invoice No :" value={transfer.transferNumber} />
            <InfoLine label="Date :" value={formatBillDate(transfer.transferDate)} />
            <InfoLine label="Status :" value={statusText} />
            <InfoLine label="From Shop :" value={transfer.fromName} />
            <InfoLine label="To Shop :" value={transfer.toName} />
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse">
            <thead>
              <tr>
                <th className={`${headCell} w-[8%]`}>SL.</th>
                <th className={`${headCell} text-left`}>Product</th>
                <th className={`${headCell} w-[14%]`}>SKU</th>
                <th className={`${headCell} w-[12%]`}>Qty</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={String(item.variantId) || index}>
                  <td className={`${cell} text-center align-middle`}>{index + 1}</td>
                  <td className={cell}>
                    <span className="block font-medium">{item.productName || "Item"}</span>
                    {item.variantLabel ? (
                      <span className="block text-[11px] text-[#666]">{item.variantLabel}</span>
                    ) : null}
                  </td>
                  <td className={`${cell} align-middle`}>{item.sku || "—"}</td>
                  <td className={`${cell} text-center align-middle font-semibold`}>{item.quantity}</td>
                </tr>
              ))}
              <tr>
                <td className={cell} colSpan={3} />
                <td className={`${cell} text-center align-middle font-bold`}>{totalQty}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {transfer.note ? (
          <p className="mt-4 text-[13px] leading-5">
            <span className="font-bold">Note: </span>
            {transfer.note}
          </p>
        ) : null}
      </div>

      <div className="print:hidden mt-5 flex justify-center">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded border border-[#188ae2] bg-white px-5 py-2.5 text-[14px] font-medium text-[#188ae2] shadow-sm transition hover:bg-[#f0f7ff]"
        >
          <Printer className="h-4 w-4" aria-hidden />
          Print
        </button>
      </div>
    </div>
  );
}
