"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { BookOpen } from "lucide-react";

import { showToast } from "@/lib/showToast";
import { CUSTOMER_TYPES } from "@/lib/priceTiers";
import { ADMIN_CUSTOMER_PAYMENT } from "@/Route/Adminpannelroute";

import {
  ExportButtons,
  exportExcel,
  exportPdf,
  fmtDate,
  inputClass,
  methodLabel,
  money,
  printTable,
  tdClass,
  thClass,
  theadRow,
} from "@/components/ui/Application/Admin/supplier/supplierKit";

const HEAD = ["SL", "Date", "Type", "Invoice No", "Note", "Amount", "Due"];

const signed = (value) => `${value > 0 ? "+" : value < 0 ? "-" : ""}৳${money(Math.abs(value))}`;

/** A customer's account statement */
export default function CustomerLedgerPage({ params }) {
  const { id } = use(params);
  const router = useRouter();

  const [data, setData] = useState(null);
  const [draft, setDraft] = useState({ start: "", end: "" });
  const [dates, setDates] = useState({ start: "", end: "" });
  const [term, setTerm] = useState("");

  useEffect(() => {
    let cancelled = false;

    axios
      .get(`/api/customer/${id}/ledger`, {
        params: {
          ...(dates.start && { start_date: dates.start }),
          ...(dates.end && { end_date: dates.end }),
        },
      })
      .then(({ data: result }) => {
        if (cancelled) return;

        if (result.success) setData(result.data);
        else showToast("error", result.message || "Could not load ledger");
      })
      .catch((error) => {
        if (!cancelled) showToast("error", error.response?.data?.message || "Could not load ledger");
      });

    return () => {
      cancelled = true;
    };
  }, [id, dates]);

  const rows = useMemo(() => {
    const needle = term.trim().toLowerCase();
    const list = (data?.rows || []).map((row, index) => ({ ...row, sl: index + 1 }));

    if (!needle) return list;

    return list.filter((row) =>
      [row.type, row.invoiceNo, row.note, fmtDate(row.date), money(row.amount)].join(" ").toLowerCase().includes(needle),
    );
  }, [data, term]);

  const exportBody = () =>
    rows.map((row) => [row.sl, fmtDate(row.date), row.type, row.invoiceNo, row.note, row.amount, row.balance]);

  const title = `Customer Ledger — ${data?.customer.name || ""}`;
  const s = data?.summary;

  const period =
    dates.start || dates.end
      ? `${dates.start ? fmtDate(dates.start) : "…"} – ${dates.end ? fmtDate(dates.end) : "…"}`
      : "All Period";

  return (
    <div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setDates({ ...draft });
        }}
        className="mb-[18px] flex flex-wrap items-center gap-[10px]"
      >
        <h1 className="m-0 mr-auto flex items-center gap-[10px] text-[21px] font-bold text-[#212529] dark:text-foreground">
          <BookOpen size={24} className="fill-[#16a34a]/20 text-[#16a34a]" />
          Customer Ledger
        </h1>

        <div className="flex items-stretch">
          <input
            type="date"
            aria-label="Start date"
            value={draft.start}
            onChange={(event) => setDraft({ ...draft, start: event.target.value })}
            className={`${inputClass} !w-40 rounded-r-none`}
          />
          <span className="flex w-[42px] items-center justify-center bg-[#16a34a] text-sm text-white">to</span>
          <input
            type="date"
            aria-label="End date"
            value={draft.end}
            onChange={(event) => setDraft({ ...draft, end: event.target.value })}
            className={`${inputClass} !w-40 rounded-l-none`}
          />
        </div>

        <button type="submit" className="inline-flex h-[38px] items-center gap-[6px] rounded-[6px] bg-[#16a34a] px-[12px] text-[13px] font-semibold text-white shadow-sm hover:bg-[#15803d]">
          Search
        </button>
        <button
          type="button"
          className="inline-flex h-[38px] items-center gap-[6px] rounded-[6px] bg-[#f59e0b] px-[12px] text-[13px] font-semibold text-white shadow-sm hover:bg-[#d97706]"
          onClick={() => {
            setDraft({ start: "", end: "" });
            setDates({ start: "", end: "" });
            setTerm("");
          }}
        >
          Clear
        </button>
      </form>

      {!data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-56 animate-pulse rounded-[10px] bg-white dark:bg-card" />
          <div className="h-56 animate-pulse rounded-[10px] bg-white dark:bg-card" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-[10px] border border-t-[4px] border-[#e6ebf1] border-t-[#16a34a] bg-white p-[18px] dark:border-border dark:border-t-[#16a34a] dark:bg-card">
              <span className="flex size-12 items-center justify-center rounded-full bg-green-100 text-lg font-bold text-green-700">
                {data.customer.name
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((word) => word[0])
                  .join("")
                  .toUpperCase()}
              </span>
              <h2 className="mt-3 text-lg font-bold">{data.customer.name}</h2>
              <p className="text-sm text-muted-foreground">
                {[data.customer.businessName, CUSTOMER_TYPES[data.customer.type]?.short].filter(Boolean).join(" · ")}
              </p>
              {data.customer.phone && (
                <a href={`tel:${data.customer.phone}`} className="mt-2 block text-sm">
                  📞 {data.customer.phone}
                </a>
              )}
              {data.customer.address && <p className="mt-2 text-sm text-muted-foreground">{data.customer.address}</p>}

              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  ["receive", "Receive"],
                  ["advance", "Advance"],
                  ["dismiss", "Due Dismiss"],
                ].map(([paymentType, label]) => (
                  <button
                    key={paymentType}
                    type="button"
                    onClick={() => router.push(ADMIN_CUSTOMER_PAYMENT(id, paymentType))}
                    className="rounded-[6px] border border-[#16a34a] px-3 py-1 text-[13px] font-medium text-[#16a34a] hover:bg-[#16a34a] hover:text-white"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-[10px] border border-t-[4px] border-[#e6ebf1] border-t-[#16a34a] bg-white p-[18px] dark:border-border dark:border-t-[#16a34a] dark:bg-card">
              <div className="mb-3 flex items-center gap-2">
                <h2 className="font-bold">Account summary</h2>
                <span className="ml-auto rounded-full bg-amber-100 px-3 py-0.5 text-xs font-semibold text-amber-700">{period}</span>
              </div>

              {[
                ["Opening balance", s.opening],
                ["Total sale", s.totalSale],
                ["Total received", s.totalPaid, "text-green-600"],
                ["Due dismiss", s.dismiss],
                ["Paid to customer", s.paidOut],
                ["Advance", s.advance],
              ].map(([label, value, tone]) => (
                <div key={label} className="flex justify-between border-b py-1.5 text-sm">
                  <span>{label}</span>
                  <span className={`tabular-nums ${tone || ""}`}>৳ {money(value)}</span>
                </div>
              ))}

              <div className="flex justify-between pt-2.5 font-bold">
                <span>Balance due</span>
                <span className={`tabular-nums ${s.due > 0 ? "text-red-600" : "text-green-600"}`}>৳ {money(s.due)}</span>
              </div>
            </section>
          </div>

          <section className="mt-[18px] rounded-[10px] border border-[#e6ebf1] bg-white p-[18px] dark:border-border dark:bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <ExportButtons
                onPdf={() => exportPdf(title, HEAD, exportBody())}
                onExcel={() => exportExcel("Customer-Ledger.xlsx", HEAD, exportBody())}
                onPrint={() => {
                  if (!printTable(title, HEAD, exportBody())) showToast("error", "Allow pop-ups to print");
                }}
              />

              <input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Search..." className={`${inputClass} !w-[220px]`} />
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-sm">
                <thead>
                  <tr className={theadRow}>
                    {HEAD.map((column) => (
                      <th key={column} className={thClass}>
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={HEAD.length} className={`${tdClass} py-10 text-center text-muted-foreground`}>
                        No entries in this period
                      </td>
                    </tr>
                  )}

                  {rows.map((row) => (
                    <tr key={row.sl} className="hover:bg-muted/50">
                      <td className={tdClass}>{row.sl}</td>
                      <td className={`${tdClass} whitespace-nowrap`}>{fmtDate(row.date)}</td>
                      <td className={tdClass}>
                        {row.type}
                        {row.method && <span className="block text-xs text-muted-foreground">{methodLabel(row.method)}</span>}
                      </td>
                      <td className={tdClass}>{row.invoiceNo}</td>
                      <td className={`${tdClass} max-w-60 text-xs text-muted-foreground`}>{row.note}</td>
                      <td className={`${tdClass} whitespace-nowrap font-semibold ${row.amount > 0 ? "text-red-600" : "text-green-600"}`}>
                        {signed(row.amount)}
                      </td>
                      <td className={`${tdClass} whitespace-nowrap font-semibold`}>{money(row.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-sm text-muted-foreground">
              A + amount adds to what the customer owes; a − amount takes it down.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
