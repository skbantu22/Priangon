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

const typeLabel = (type) => (type === "add" ? "Addition" : "Deduction");

const money = (value) => Number(value || 0).toFixed(2);

/**
 * Stock adjustment invoice — full page without admin sidebar.
 */
export default function AdjustmentReceipt({ adjustment, company = {}, autoPrint = false }) {
  useEffect(() => {
    if (!autoPrint) return undefined;
    const timer = setTimeout(() => window.print(), 500);
    return () => clearTimeout(timer);
  }, [autoPrint]);

  if (!adjustment) return <div className="p-4 text-center">Loading...</div>;

  const shopName = company.name || "Shop";
  const shopLogo = company.logo || "";
  const items = adjustment.items || [];
  const totalLoss =
    Number(adjustment.totalLoss) ||
    items.reduce((sum, item) => sum + (Number(item.loss) || 0), 0);

  const primaryType =
    items.length === 1
      ? typeLabel(items[0].type)
      : items.every((item) => item.type === items[0]?.type)
        ? typeLabel(items[0].type)
        : "Mixed";

  return (
    <div className="mx-auto w-full max-w-[860px]">
      <div className="print:hidden mb-4 flex justify-center">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-[6px] bg-[#3d5afe] px-4 py-2 text-[13px] font-semibold text-white shadow-sm hover:brightness-110"
        >
          <Printer size={16} /> Print
        </button>
      </div>

      <div
        id="invoice-print"
        className="bg-white px-6 py-7 text-[13px] leading-snug text-[#111] shadow-[0_1px_8px_rgba(0,0,0,0.12)] print:p-0 print:shadow-none"
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            {shopLogo ? (
              <img src={shopLogo} alt="" className="mb-2 h-14 max-w-[220px] object-contain object-left" />
            ) : null}
            <h1 className="text-[20px] font-bold leading-tight text-[#188ae2]">{shopName}</h1>
            <p className="mt-3 text-[15px] font-semibold">Stock Adjustment</p>
          </div>

          <div className="shrink-0 sm:min-w-[260px]">
            <InfoLine label="Invoice No :" value={adjustment.adjustmentNumber} />
            <InfoLine label="Date :" value={formatBillDate(adjustment.adjustmentDate)} />
            <InfoLine label="Shop :" value={adjustment.locationName} />
            <InfoLine label="Type :" value={primaryType} />
            <InfoLine label="Status :" value="Confirmed" />
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse">
            <thead>
              <tr>
                <th className={`${headCell} w-[8%]`}>SL.</th>
                <th className={`${headCell} text-left`}>Product</th>
                <th className={`${headCell} w-[12%]`}>Type</th>
                <th className={`${headCell} w-[10%]`}>Qty</th>
                <th className={`${headCell} w-[12%]`}>Loss</th>
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
                  <td className={`${cell} text-center`}>{typeLabel(item.type)}</td>
                  <td className={`${cell} text-center`}>{item.quantity}</td>
                  <td className={`${cell} text-right`}>{money(item.loss)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={4} className={`${cell} text-right font-bold`}>
                  Total Loss
                </td>
                <td className={`${cell} text-right font-bold`}>{money(totalLoss)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
