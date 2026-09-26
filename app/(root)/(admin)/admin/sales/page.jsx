"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { ShoppingCart } from "lucide-react";

import { showToast } from "@/lib/showToast";
import { ADMIN_SALE_RETURN_ADD } from "@/Route/Adminpannelroute";
import {
  ActionMenu,
  DateRange,
  EmptyRow,
  ExportButtons,
  ListCard,
  Pagination,
  btn,
  exportExcel,
  exportPdf,
  inputClass,
  money,
  printTable,
  tdClass,
  thClass,
  theadRow,
  totalRow,
} from "@/components/ui/Application/Admin/supplier/supplierKit";

// each kind of buyer is kept apart, the way their price lists are
const TABS = [
  ["", "All Sales"],
  ["retail", "Buyer / Retail"],
  ["dealer", "Dealer"],
  ["subDealer", "Sub Dealer"],
  ["wholesaler", "Wholesaler"],
  ["exchange", "Exchange"],
];
const TYPE_LABEL = { retail: "Buyer", dealer: "Dealer", subDealer: "Sub Dealer", wholesaler: "Wholesaler" };
const STATUS = { Paid: "bg-[#e8f7f0] text-[#0b8a45]", "Partial Due": "bg-[#fff6dd] text-[#9a6a00]", Due: "bg-[#fff1f1] text-[#d63939]" };
const EMPTY = { paymentStatus: "", soldBy: "", from: "", to: "", search: "" };

const fmt = (v) => {
  const d = new Date(v);
  return `${d.toLocaleDateString("en-GB")} ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
};

const COLUMNS = ["Sl", "Date", "Invoice No", "Items", "Customer", "Phone", "Type", "Sale By", "Total", "Paid", "Due", "Returned", "Payment Status", "Remark"];

export default function SalesPage() {
  return (
    <Suspense fallback={<div className="h-[420px] animate-pulse rounded-[8px] bg-white dark:bg-card" />}>
      <SaleList />
    </Suspense>
  );
}

/** "Manage Pos Sale", like 360's Sale List, split by customer type */
function SaleList() {
  const router = useRouter();
  const params = useSearchParams();
  const tab = params.get("type") || "";

  const [draft, setDraft] = useState(EMPTY);
  const [filters, setFilters] = useState(EMPTY);
  const [limit, setLimit] = useState("20");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);

  const query = (extra) => ({
    ...(tab === "exchange" ? { exchange: 1 } : tab && { customerType: tab }),
    ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
    ...extra,
  });

  useEffect(() => {
    let cancelled = false;
    const params = {
      ...(tab === "exchange" ? { exchange: 1 } : tab && { customerType: tab }),
      ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
      page,
      limit,
    };
    axios
      .get("/api/sales", { params })
      .then(({ data }) => {
        if (cancelled) return;
        if (!data.success) showToast("error", data.message);
        setResult(data.success ? data : { data: [], summary: {}, pages: 1, from: 0, total: 0 });
      })
      .catch((error) => {
        if (!cancelled) showToast("error", error.response?.data?.message || "Could not load sales");
      });
    return () => {
      cancelled = true;
    };
  }, [tab, filters, page, limit, version]);

  const rows = result?.data || [];
  const title = TABS.find(([k]) => k === tab)?.[1] || "Sale List";

  const editRemark = async (row) => {
    const remark = window.prompt(`Remark for ${row.orderNumber}`, row.remark || "");
    if (remark === null) return;
    try {
      const { data } = await axios.patch(`/api/sales/${row._id}`, { remark });
      showToast(data.success ? "success" : "error", data.message);
      if (data.success) setVersion((v) => v + 1);
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not save");
    }
  };

  const actions = (row) => [
    ["Invoice", () => window.open(`/admin/print/${row._id}`, "_blank")],
    ["Sale Return", () => router.push(ADMIN_SALE_RETURN_ADD(row._id))],
    ["Edit Remark", () => editRemark(row)],
  ];

  const withAllRows = async (handle) => {
    setBusy(true);
    try {
      const all = [];
      for (let p = 1; p <= 20; p++) {
        const { data } = await axios.get("/api/sales", { params: query({ page: p, limit: 500 }) });
        if (!data.success) throw new Error(data.message);
        all.push(...data.data);
        if (!data.hasMore) break;
      }
      const body = all.map((r, i) => [
        i + 1,
        fmt(r.createdAt),
        r.orderNumber,
        r.itemCount,
        r.customerName,
        r.phone || "",
        TYPE_LABEL[r.customerType] || "Buyer",
        r.soldBy || "",
        r.total,
        r.paidAmount,
        r.dueAmount,
        r.returned,
        r.paymentStatus,
        r.remark || "",
      ]);
      await handle(body, ["", "", "Total", result.summary.items, "", "", "", "", result.summary.total, result.summary.paid, result.summary.due, "", "", ""]);
    } catch (error) {
      showToast("error", error.message || "Could not export");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ListCard
      title={title === "All Sales" ? "Sale List" : `${title} Sales`}
      actions={
        <Link href="/admin/pos" className={btn.primary}>
          <ShoppingCart size={14} /> POS
        </Link>
      }
    >
      <div className="mb-4 flex flex-wrap gap-[6px]" role="tablist">
        {TABS.map(([key, label]) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => {
              setPage(1);
              setResult(null);
              router.replace(key ? `/admin/sales?type=${key}` : "/admin/sales");
            }}
            className={`px-[12px] py-[6px] text-[13px] font-semibold ${tab === key ? "bg-[#00801a] text-white" : "bg-[#eef6f0] text-[#00801a] dark:bg-muted dark:text-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setFilters({ ...draft, search: draft.search.trim() });
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <select
          value={limit}
          onChange={(e) => {
            setLimit(e.target.value);
            setPage(1);
          }}
          className={`${inputClass} !w-20`}
          aria-label="Rows per page"
        >
          {["10", "20", "50", "100"].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <select value={draft.paymentStatus} onChange={(e) => setDraft({ ...draft, paymentStatus: e.target.value })} className={`${inputClass} !w-36`} aria-label="Payment status">
          <option value="">All Payment</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial Due</option>
          <option value="due">Due</option>
        </select>
        <DateRange className="w-full sm:w-[300px]" start={draft.from} end={draft.to} onStart={(v) => setDraft({ ...draft, from: v })} onEnd={(v) => setDraft({ ...draft, to: v })} />
        <input
          value={draft.search}
          onChange={(e) => setDraft({ ...draft, search: e.target.value })}
          placeholder="Search by invoice, customer, phone, IMEI, product..."
          className={`${inputClass} min-w-[220px] flex-1`}
        />
        <button type="submit" className={btn.info}>
          Search
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft(EMPTY);
            setFilters(EMPTY);
            setPage(1);
          }}
          className={btn.warning}
        >
          Clear
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <ExportButtons
          disabled={busy || !rows.length}
          onPdf={() => withAllRows((body, foot) => exportPdf(title, COLUMNS, body, foot))}
          onExcel={() => withAllRows((body, foot) => exportExcel(`${title}.xlsx`, COLUMNS, body, foot))}
          onPrint={() =>
            withAllRows((body, foot) => {
              if (!printTable(title, COLUMNS, body, foot)) showToast("error", "Allow pop-ups to print");
            })
          }
        />
        {result?.summary && (
          <span className="flex flex-wrap gap-2 text-[13px]">
            <span className="bg-[#eaf4fd] px-[10px] py-[5px] text-[#188ae2]">Total ৳ {money(result.summary.total)}</span>
            <span className="bg-[#e8f7f0] px-[10px] py-[5px] text-[#0b8a45]">Paid ৳ {money(result.summary.paid)}</span>
            <span className="bg-[#fff1f1] px-[10px] py-[5px] text-[#ff5b5b]">Due ৳ {money(result.summary.due)}</span>
          </span>
        )}
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[1250px] border-collapse text-left text-sm">
          <thead>
            <tr className={theadRow}>
              {[...COLUMNS, "Action"].map((h) => (
                <th key={h} className={thClass}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!result &&
              [1, 2, 3].map((n) => (
                <tr key={n}>
                  <td colSpan={15} className={tdClass}>
                    <div className="h-4 animate-pulse bg-slate-100 dark:bg-muted" />
                  </td>
                </tr>
              ))}
            {result && !rows.length && <EmptyRow colSpan={15} title="No sales found" hint="Change the date range or make a sale from the POS." />}
            {rows.map((row, i) => (
              <tr key={row._id} className="hover:bg-[#f5f7f9] dark:hover:bg-muted/50">
                <td className={tdClass}>{result.from + i}</td>
                <td className={`${tdClass} whitespace-nowrap`}>{fmt(row.createdAt)}</td>
                <td className={tdClass}>
                  <a href={`/admin/print/${row._id}`} target="_blank" rel="noreferrer" className="text-[#188ae2] hover:underline">
                    {row.orderNumber}
                  </a>
                  {row.orderType === "exchange" && <span className="block text-[11px] text-[#7a33cb]">Exchange</span>}
                </td>
                <td className={tdClass}>{row.itemCount}</td>
                <td className={tdClass}>{row.customerName}</td>
                <td className={tdClass}>{row.phone}</td>
                <td className={tdClass}>{TYPE_LABEL[row.customerType] || "Buyer"}</td>
                <td className={tdClass}>{row.soldBy}</td>
                <td className={`${tdClass} font-semibold`}>{money(row.total)}</td>
                <td className={tdClass}>{money(row.paidAmount)}</td>
                <td className={`${tdClass} ${row.dueAmount > 0 ? "font-semibold text-[#ff5b5b]" : ""}`}>{money(row.dueAmount)}</td>
                <td className={tdClass}>{row.returned ? money(row.returned) : ""}</td>
                <td className={tdClass}>
                  <span className={`whitespace-nowrap px-[8px] py-[2px] text-[12px] font-semibold ${STATUS[row.paymentStatus]}`}>{row.paymentStatus}</span>
                </td>
                <td className={`${tdClass} max-w-[160px] truncate`} title={row.remark || ""}>
                  {row.remark}
                </td>
                <td className={tdClass}>
                  <ActionMenu items={actions(row)} />
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className={totalRow}>
                <td colSpan={3} className={tdClass}>
                  Total:
                </td>
                <td className={tdClass}>{result.summary.items}</td>
                <td colSpan={4} className={tdClass} />
                <td className={tdClass}>{money(result.summary.total)}</td>
                <td className={tdClass}>{money(result.summary.paid)}</td>
                <td className={tdClass}>{money(result.summary.due)}</td>
                <td colSpan={4} className={tdClass} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {result && <Pagination page={page} pages={result.pages} from={result.from} count={rows.length} total={result.total} onPage={setPage} />}
    </ListCard>
  );
}
