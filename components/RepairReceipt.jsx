"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";

const cell = "border border-black px-2 py-1.5 align-top text-[#111] text-[13px]";
const headCell = `${cell} bg-[#f4f4f5] font-bold align-middle text-center`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const STATUS = {
  received: "Received",
  in_progress: "In progress",
  waiting_parts: "Waiting for parts",
  repaired: "Repaired - ready to deliver",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function formatBillDate(value) {
  if (!value) return "";
  const date = new Date(value);
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

const money = (value) => Number(value || 0).toFixed(2);

/**
 * Repair invoice for the customer: what came in, what was done and what is
 * owed. Full page, printed without the admin sidebar.
 */
export default function RepairReceipt({ job, company = {}, autoPrint = false }) {
  useEffect(() => {
    if (!autoPrint) return undefined;
    const timer = setTimeout(() => window.print(), 500);
    return () => clearTimeout(timer);
  }, [autoPrint]);

  if (!job) return <div className="p-4 text-center">Loading...</div>;

  const parts = job.parts || [];
  const charge = Number(job.serviceCharge) || 0;
  const total = Number(job.total) || 0;
  const paid = Number(job.paid) || 0;
  const due = Number(job.due) || 0;
  const billed = total > 0 || charge > 0 || parts.length > 0;

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
            {company.logo ? (
              <img src={company.logo} alt="" className="mb-2 h-14 max-w-[220px] object-contain object-left" />
            ) : null}
            <h1 className="text-[20px] font-bold leading-tight text-[#188ae2]">{company.name || "Shop"}</h1>
            {company.address ? <p className="mt-1 text-[13px]">{company.address}</p> : null}
            {company.phone ? <p className="text-[13px]">{company.phone}</p> : null}
            <p className="mt-3 text-[15px] font-semibold">Repair Invoice</p>
          </div>

          <div className="shrink-0 sm:min-w-[260px]">
            <InfoLine label="Job No :" value={job.jobNumber} />
            <InfoLine label="Received :" value={formatBillDate(job.receivedAt)} />
            {job.expectedAt ? <InfoLine label="Promised :" value={formatBillDate(job.expectedAt)} /> : null}
            {job.deliveredAt ? <InfoLine label="Delivered :" value={formatBillDate(job.deliveredAt)} /> : null}
            <InfoLine label="Status :" value={STATUS[job.status] || job.status} />
          </div>
        </div>

        <div className="mt-5 grid gap-x-8 sm:grid-cols-2">
          <div>
            <InfoLine label="Customer :" value={job.customerName} />
            {job.phone ? <InfoLine label="Mobile :" value={job.phone} /> : null}
          </div>
          <div>
            <InfoLine label="Phone :" value={job.device} />
            {job.imei ? <InfoLine label="IMEI :" value={job.imei} /> : null}
            {job.accessories ? <InfoLine label="Came with it :" value={job.accessories} /> : null}
          </div>
        </div>

        <p className="mt-4 text-[13px]">
          <span className="font-semibold">Problem :</span> {job.issue}
        </p>
        {job.technicianName ? (
          <p className="text-[13px]">
            <span className="font-semibold">Technician :</span> {job.technicianName}
          </p>
        ) : null}

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse">
            <thead>
              <tr>
                <th className={`${headCell} w-[8%]`}>SL.</th>
                <th className={`${headCell} text-left`}>Description</th>
                <th className={`${headCell} w-[20%]`}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {!billed && (
                <tr>
                  <td colSpan={3} className={`${cell} text-center`}>
                    Estimated cost: {money(job.estimate)}
                  </td>
                </tr>
              )}
              {charge > 0 && (
                <tr>
                  <td className={`${cell} text-center`}>1</td>
                  <td className={cell}>Service charge</td>
                  <td className={`${cell} text-right`}>{money(charge)}</td>
                </tr>
              )}
              {parts.map((part, index) => (
                <tr key={`${part.name}-${index}`}>
                  <td className={`${cell} text-center`}>{index + 1 + (charge > 0 ? 1 : 0)}</td>
                  <td className={cell}>{part.name}</td>
                  <td className={`${cell} text-right`}>{money(part.price)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={2} className={`${cell} text-right font-bold`}>Total</td>
                <td className={`${cell} text-right font-bold`}>{money(total)}</td>
              </tr>
              <tr>
                <td colSpan={2} className={`${cell} text-right`}>Paid</td>
                <td className={`${cell} text-right`}>{money(paid)}</td>
              </tr>
              <tr>
                <td colSpan={2} className={`${cell} text-right font-bold`}>Due</td>
                <td className={`${cell} text-right font-bold`}>{money(due)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {job.note ? (
          <p className="mt-4 text-[12px]">
            <span className="font-semibold">Note :</span> {job.note}
          </p>
        ) : null}

        <div className="print-signatures mt-12 flex justify-between text-[12px]">
          <span className="border-t border-black px-6 pt-1">Customer signature</span>
          <span className="border-t border-black px-6 pt-1">Authorized signature</span>
        </div>
        <p className="mt-6 text-center text-[11px] text-[#666]">Please bring this invoice when you collect your phone.</p>
      </div>
    </div>
  );
}
