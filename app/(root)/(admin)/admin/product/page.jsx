"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import axios from "axios";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { ADMIN_PRODUCT_ADD, ADMIN_PRODUCT_EDIT } from "@/Route/Adminpannelroute";
import { posCategoriesQueryOptions, posShowroomsQueryOptions } from "@/lib/posProducts";
import { skipOptimize } from "@/lib/imageSrc";
import { showToast } from "@/lib/showToast";
import {
  ActionMenu,
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

const EMPTY_FILTERS = { brand: "", category: "", location: "all", sort: "newest", status: "active", q: "" };

const SORTS = [
  ["newest", "Newest"],
  ["oldest", "Oldest"],
  ["name", "Name A-Z"],
  ["stock-desc", "Stock High-Low"],
  ["stock-asc", "Stock Low-High"],
  ["value-desc", "Stock Value"],
  ["price-asc", "Price Low-High"],
  ["price-desc", "Price High-Low"],
];

const TABS = [
  ["", "All", "all"],
  ["in", "In Stock", "in"],
  ["low", "Low Stock", "low"],
  ["out", "Out of Stock", "out"],
  ["issue", "Price Issue", "issue"],
];

// the four sale rates, in the order the POS price list uses them
const RATES = [
  ["sellingPrice", "Buyer"],
  ["dealerPrice", "Dealer"],
  ["subDealerPrice", "Sub Dealer"],
  ["wholesalerPrice", "Wholesaler"],
];

const COLUMNS = [
  "SL",
  "Product",
  "Code",
  "Variant",
  "Barcode",
  "Brand",
  "Category",
  "Stock",
  "Cost",
  ...RATES.map(([, label]) => label),
  "Stock Value",
];

const fetchList = async (params) => {
  const { data } = await axios.get("/api/product/list", { params });
  if (!data.success) throw new Error(data.message || "Could not load products");
  return data;
};

const marginPct = (rate, cost) => (cost > 0 && rate > 0 ? Math.round(((rate - cost) / cost) * 100) : null);

/** One sale rate with its margin over cost; flags a rate that is not set or loses money */
function RateCell({ line, field }) {
  const rate = line[field];

  if (!rate) {
    return (
      <span className="text-[12px] font-medium text-amber-600" title="Not set: the POS charges this buyer the Buyer price">
        Not set
      </span>
    );
  }

  const pct = marginPct(rate, line.cost);
  const loss = pct !== null && pct <= 0;

  return (
    <span className={`whitespace-nowrap ${loss ? "font-semibold text-red-600" : ""}`} title={loss ? "At or below cost" : undefined}>
      {money(rate)}
      {pct !== null && (
        <span className={`ml-1 text-[11px] ${loss ? "" : "text-emerald-600"}`}>
          {pct > 0 ? "+" : ""}
          {pct}%
        </span>
      )}
    </span>
  );
}

/** Product list, laid out like the 360 product screen, with the dealer price list beside every variant */
export default function ProductsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [stock, setStock] = useState("");
  const [limit, setLimit] = useState("20");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);

  const params = (extra) => ({
    ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "")),
    ...(stock && { stock }),
    ...extra,
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["product-list", filters, stock, limit, page],
    queryFn: () => fetchList(params({ page, limit })),
    placeholderData: keepPreviousData,
  });

  const { data: categories = [] } = useQuery({ ...posCategoriesQueryOptions(), refetchOnWindowFocus: false });
  const { data: showrooms = [] } = useQuery({ ...posShowroomsQueryOptions(), refetchOnWindowFocus: false });

  const rows = data?.items ?? [];
  const totals = data?.totals;
  const counts = data?.counts || {};
  const isTrash = filters.status === "trash";

  const reset = () => {
    setPage(1);
    setSelected([]);
  };

  const search = (event) => {
    event?.preventDefault();
    setFilters({ ...draft, q: draft.q.trim() });
    reset();
  };

  const clear = () => {
    setDraft(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setStock("");
    reset();
  };

  const pickTab = (value) => {
    setStock(value);
    reset();
  };

  const runAction = async (ids, action) => {
    if (!ids.length) return showToast("error", "Select products first");
    if (action === "trash" && !confirm(`Move ${ids.length} product(s) to trash?`)) return;

    setBusy(true);
    try {
      const { data: res } = await axios.put("/api/product/bulk", { ids, action });
      showToast(res.success ? "success" : "error", res.message);
      setSelected([]);
      queryClient.invalidateQueries({ queryKey: ["product-list"] });
      queryClient.invalidateQueries({ queryKey: ["pos-products"] });
    } catch (error) {
      showToast("error", error.response?.data?.message || "Action failed");
    } finally {
      setBusy(false);
    }
  };

  // export / print take every product matching the filters, one line per variant
  const withAllRows = async (handle) => {
    setBusy(true);
    try {
      const all = await fetchList(params({ limit: "all" }));
      const body = [];
      all.items.forEach((p, index) =>
        (p.variants.length ? p.variants : [{}]).forEach((v, k) =>
          body.push([
            k ? "" : index + 1,
            k ? "" : p.name,
            k ? "" : p.code,
            v.label || "",
            v.barcode || "",
            k ? "" : p.brand,
            k ? "" : p.category,
            v.stock ?? 0,
            v.cost ?? 0,
            ...RATES.map(([field]) => v[field] || "Not set"),
            (v.stock || 0) * (v.cost || 0),
          ]),
        ),
      );
      const t = all.totals;
      const foot = ["", "Total", "", "", "", "", "", t.stock, "", "", "", "", "", t.cost];
      await handle(body, foot);
    } catch (error) {
      showToast("error", error.message || "Could not export");
    } finally {
      setBusy(false);
    }
  };

  const rowActions = (p) => [
    ["Edit / Variants", () => router.push(ADMIN_PRODUCT_EDIT(p._id))],
    p.deleted ? ["Restore", () => runAction([p._id], "restore")] : ["Move to trash", () => runAction([p._id], "trash"), "danger"],
  ];

  const allChecked = rows.length > 0 && rows.every((p) => selected.includes(p._id));
  const check = (id, on) => setSelected(on ? [...selected, id] : selected.filter((x) => x !== id));
  const filtered = filters.q || filters.brand || filters.category || filters.location !== "all" || stock;

  // profit if every unit in view went to one kind of buyer
  const profits = totals
    ? [
        ["Buyer", totals.retail],
        ["Dealer", totals.dealer],
        ["Sub Dealer", totals.subDealer],
        ["Wholesaler", totals.wholesaler],
      ].map(([label, value]) => [label, value - totals.cost])
    : [];

  return (
    <div className="space-y-4">
      <ListCard
        title="Product List"
        actions={
          <Link href={ADMIN_PRODUCT_ADD} className={btn.primary}>
            <Plus size={14} /> Add New Product
          </Link>
        }
      >
        {/* stock worth, and the profit per price list */}
        {totals && (
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["Stock Qty", totals.stock.toLocaleString("en-BD"), ""],
              ["Stock Value (Cost)", `৳${money(totals.cost)}`, ""],
              ...profits.map(([label, value]) => [
                `Profit · ${label}`,
                `৳${money(value)}`,
                value < 0 ? "text-red-600" : "text-emerald-600",
              ]),
            ].map(([label, value, tone]) => (
              <div key={label} className="rounded-[6px] border border-[#ebeff2] bg-[#f7f9fb] px-3 py-2 dark:border-border dark:bg-muted">
                <p className="m-0 text-[11px] text-muted-foreground">{label}</p>
                <p className={`m-0 text-[16px] font-semibold tabular-nums ${tone}`}>{value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {TABS.map(([key, label, countKey]) => (
            <button
              key={key || "all"}
              type="button"
              onClick={() => pickTab(key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
                stock === key
                  ? "bg-[#188ae2] text-white shadow"
                  : "bg-[#f1f5f9] text-[#495057] hover:bg-[#e2e8f0] dark:bg-muted dark:text-muted-foreground"
              }`}
            >
              {label}
              <span className={`rounded-full px-1.5 text-[11px] ${stock === key ? "bg-white/25" : "bg-white dark:bg-background"}`}>
                {counts[countKey] ?? 0}
              </span>
            </button>
          ))}
        </div>

        <form onSubmit={search} className="flex flex-wrap items-center gap-2">
          <select
            value={limit}
            onChange={(event) => {
              setLimit(event.target.value);
              reset();
            }}
            className={`${inputClass} !w-20`}
            aria-label="Rows per page"
          >
            {["10", "20", "50", "100"].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>

          <select value={draft.brand} onChange={(e) => setDraft({ ...draft, brand: e.target.value })} className={`${inputClass} !w-36`} aria-label="Brand">
            <option value="">All Brands</option>
            {(data?.brands || []).map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className={`${inputClass} !w-40`} aria-label="Category">
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>

          <select value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} className={`${inputClass} !w-40`} aria-label="Stock location">
            <option value="all">All Stock</option>
            <option value="warehouse">Warehouse / Godown</option>
            {showrooms.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>

          <select value={draft.sort} onChange={(e) => setDraft({ ...draft, sort: e.target.value })} className={`${inputClass} !w-36`} aria-label="Sort">
            {SORTS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} className={`${inputClass} !w-28`} aria-label="Status">
            <option value="active">Active</option>
            <option value="trash">Trash</option>
          </select>

          <input
            value={draft.q}
            onChange={(e) => setDraft({ ...draft, q: e.target.value })}
            placeholder="Search Name, Code, Barcode, SKU..."
            className={`${inputClass} min-w-[220px] flex-1`}
          />

          <button type="submit" className={btn.info}>
            Search
          </button>
          <button type="button" onClick={clear} className={btn.warning}>
            Clear
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <ExportButtons
            disabled={busy}
            onPdf={() => withAllRows((body, foot) => exportPdf("Product List", COLUMNS, body, foot))}
            onExcel={() => withAllRows((body, foot) => exportExcel("Products.xlsx", COLUMNS, body, foot))}
            onPrint={() =>
              withAllRows((body, foot) => {
                if (!printTable("Product List", COLUMNS, body, foot)) showToast("error", "Allow pop-ups to print");
              })
            }
          />
          <ActionMenu
            label={selected.length ? `Actions (${selected.length})` : "Actions"}
            items={[
              isTrash ? ["Restore", () => runAction(selected, "restore")] : ["Move to trash", () => runAction(selected, "trash"), "danger"],
            ]}
          />
          <span className="ml-auto text-[12px] text-muted-foreground">
            % = margin over cost · <span className="text-amber-600">Not set</span> = POS charges the Buyer price
          </span>
        </div>

        {/* Phones: one card per product */}
        <div className="mt-3 space-y-2.5 md:hidden">
          {isLoading && [1, 2, 3].map((n) => <div key={n} className="h-[140px] animate-pulse rounded-[6px] bg-slate-100 dark:bg-muted" />)}

          {!isLoading && rows.length === 0 && (
            <div className="rounded-[6px] border border-dashed border-[#d4dae0] px-4 py-8 text-center text-[15px] font-medium text-[#495057]">
              {isError ? "Could not load products" : filtered ? "No products match these filters" : "No products yet"}
            </div>
          )}

          {!isLoading &&
            rows.map((p) => (
              <article key={p._id} className="rounded-[6px] border border-[#ebeff2] bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-border dark:bg-card">
                <div className="flex items-start gap-2">
                  <input type="checkbox" className="mt-[5px]" checked={selected.includes(p._id)} onChange={(e) => check(p._id, e.target.checked)} aria-label={`Select ${p.name}`} />
                  <Thumb src={p.image} />
                  <div className="min-w-0 flex-1">
                    <Link href={ADMIN_PRODUCT_EDIT(p._id)} className="line-clamp-2 text-[15px] font-semibold">
                      {p.name}
                    </Link>
                    <p className="m-0 truncate text-[12px] text-muted-foreground">{[p.brand, p.category, p.code].filter(Boolean).join(" · ")}</p>
                    <Flags p={p} />
                  </div>
                  <ActionMenu items={rowActions(p)} />
                </div>

                {p.variants.map((v) => (
                  <div key={v._id} className="mt-2 rounded-[4px] bg-[#f7f9fb] px-2 py-1.5 text-[13px] dark:bg-muted">
                    <div className="flex justify-between gap-2">
                      <span className="truncate font-medium">{v.label || v.barcode}</span>
                      <span className={`tabular-nums ${v.stock <= 0 ? "text-red-600" : ""}`}>
                        Stock {v.stock} · Cost {money(v.cost)}
                      </span>
                    </div>
                    <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5">
                      {RATES.map(([field, label]) => (
                        <div key={field} className="flex justify-between gap-1">
                          <dt className="text-[11px] text-muted-foreground">{label}</dt>
                          <dd className="m-0 tabular-nums">
                            <RateCell line={v} field={field} />
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </article>
            ))}
        </div>

        <div className="mt-4 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1150px] border-collapse text-sm">
            <thead>
              <tr className={theadRow}>
                <th rowSpan={2} className={thClass}>
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={(e) => setSelected(e.target.checked ? rows.map((p) => p._id) : [])}
                    aria-label="Select all"
                  />
                </th>
                <th rowSpan={2} className={thClass}>SL</th>
                <th rowSpan={2} className={thClass}>Product</th>
                <th rowSpan={2} className={thClass}>Variant · Barcode</th>
                <th rowSpan={2} className={thClass}>Stock</th>
                <th rowSpan={2} className={thClass}>Cost</th>
                <th colSpan={4} className={`${thClass} text-center`}>Sale Rate (margin)</th>
                <th rowSpan={2} className={thClass}>Stock Value</th>
                <th rowSpan={2} className={thClass}>Action</th>
              </tr>
              <tr className={theadRow}>
                {RATES.map(([field, label]) => (
                  <th key={field} className={thClass}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index}>
                    <td colSpan={12} className={tdClass}>
                      <div className="h-4 animate-pulse rounded bg-slate-100 dark:bg-muted" />
                    </td>
                  </tr>
                ))}

              {!isLoading && isError && (
                <tr>
                  <td colSpan={12} className={`${tdClass} py-10 text-center`}>
                    <span className="text-red-600">Could not load products.</span>{" "}
                    <button type="button" className="text-[#188ae2] underline" onClick={() => refetch()}>
                      Retry
                    </button>
                  </td>
                </tr>
              )}

              {!isLoading && !isError && rows.length === 0 && (
                <EmptyRow
                  colSpan={12}
                  title={filtered ? "No products match these filters" : "No products yet"}
                  hint="Add a product, then its variants and stock through a purchase."
                />
              )}

              {!isLoading &&
                rows.map((p, index) => {
                  const lines = p.variants.length ? p.variants : [null];
                  const perLine = (render) =>
                    lines.map((v, k) => (
                      <div key={k} className="leading-6">
                        {v ? render(v) : "—"}
                      </div>
                    ));

                  return (
                    <tr key={p._id} className={p.deleted ? "bg-[#fff7f7] text-[#98a6ad] dark:bg-red-950/30" : "hover:bg-[#f5f7f9] dark:hover:bg-muted/50"}>
                      <td className={tdClass}>
                        <input type="checkbox" checked={selected.includes(p._id)} onChange={(e) => check(p._id, e.target.checked)} aria-label={`Select ${p.name}`} />
                      </td>
                      <td className={tdClass}>{data.from + index}</td>
                      <td className={tdClass}>
                        <div className="flex min-w-[220px] items-center gap-2">
                          <Thumb src={p.image} />
                          <div className="min-w-0">
                            <Link href={ADMIN_PRODUCT_EDIT(p._id)} className="line-clamp-2 font-medium hover:text-blue-600" title={p.name}>
                              {p.name}
                            </Link>
                            <span className="block text-xs text-muted-foreground">
                              {[p.brand, p.category, p.code].filter(Boolean).join(" · ")}
                            </span>
                            <Flags p={p} />
                          </div>
                        </div>
                      </td>
                      <td className={`${tdClass} text-[13px]`}>
                        {p.variants.length ? (
                          perLine((v) => (
                            <span className="whitespace-nowrap">
                              {v.label && <span className="font-medium">{v.label} · </span>}
                              <span className="font-mono text-[12px] text-muted-foreground">{v.barcode}</span>
                            </span>
                          ))
                        ) : (
                          <Link href={ADMIN_PRODUCT_EDIT(p._id)} className="text-amber-600 hover:underline">
                            No variants — add
                          </Link>
                        )}
                      </td>
                      <td className={tdClass}>
                        {perLine((v) => <span className={v.stock <= 0 ? "text-red-600" : ""}>{v.stock}</span>)}
                        {p.variants.length > 1 && <div className="border-t font-semibold leading-6">{p.totalStock}</div>}
                      </td>
                      <td className={tdClass}>{perLine((v) => (v.cost ? money(v.cost) : <span className="text-amber-600">—</span>))}</td>
                      {RATES.map(([field]) => (
                        <td key={field} className={tdClass}>
                          {perLine((v) => <RateCell line={v} field={field} />)}
                        </td>
                      ))}
                      <td className={`${tdClass} font-semibold`}>{money(p.stockValue)}</td>
                      <td className={tdClass}>
                        <ActionMenu items={rowActions(p)} />
                      </td>
                    </tr>
                  );
                })}
            </tbody>

            {!isLoading && totals && rows.length > 0 && (
              <tfoot>
                <tr className={totalRow}>
                  <td colSpan={4} className={tdClass}>
                    Total ({data.total} products)
                  </td>
                  <td className={tdClass}>{totals.stock}</td>
                  <td colSpan={5} className={tdClass} />
                  <td className={tdClass}>{money(totals.cost)}</td>
                  <td className={tdClass} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <Pagination page={page} pages={data?.pages || 1} from={data?.from || 0} count={rows.length} total={data?.total || 0} onPage={setPage} />
      </ListCard>
    </div>
  );
}

function Thumb({ src }) {
  return (
    <div className="relative size-10 shrink-0 overflow-hidden rounded-[4px] border bg-white">
      <Image src={src || "/placeholder.png"} alt="" fill sizes="40px" className="object-contain" unoptimized={skipOptimize(src)} />
    </div>
  );
}

function Flags({ p }) {
  const flags = [
    p.deleted && ["Trash", "bg-red-100 text-red-700"],
    p.variants.length > 0 && p.totalStock <= 0 && ["Out of stock", "bg-red-100 text-red-700"],
    p.lowStock && p.totalStock > 0 && ["Low stock", "bg-orange-100 text-orange-700"],
    p.missingTier && ["Dealer rate not set", "bg-amber-100 text-amber-800"],
    p.lossTier && ["Below cost", "bg-red-100 text-red-700"],
  ].filter(Boolean);

  if (!flags.length) return null;

  return (
    <span className="mt-0.5 flex flex-wrap gap-1">
      {flags.map(([text, tone]) => (
        <span key={text} className={`rounded px-1.5 text-[10px] font-semibold ${tone}`}>
          {text}
        </span>
      ))}
    </span>
  );
}
