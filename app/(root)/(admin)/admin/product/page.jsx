"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import axios from "axios";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ADMIN_DASHBOARD,
  ADMIN_PRODUCT_ADD,
  ADMIN_PRODUCT_EDIT,
  ADMIN_PRODUCT_SHOW,
} from "@/Route/Adminpannelroute";
import { posCategoriesQueryOptions, posShowroomsQueryOptions } from "@/lib/posProducts";
import { skipOptimize } from "@/lib/imageSrc";
import { showToast } from "@/lib/showToast";

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_PRODUCT_SHOW, label: "Products" },
];

const INITIAL_FILTERS = {
  limit: 10,
  brand: "",
  location: "all",
  sort: "newest",
  status: "active",
  category: "",
  subcategory: "",
  web: "",
  q: "",
};

const money = (n) => Number(n || 0).toLocaleString("en-BD");

const selectClass =
  "h-9 w-full rounded-lg border border-gray-200 bg-white px-2 text-xs outline-none focus:border-primary dark:border-white/10 dark:bg-card";

const toParams = (filters, page) =>
  new URLSearchParams(
    Object.entries({ ...filters, page }).filter(([, v]) => v !== "" && v != null),
  ).toString();

const fetchList = async (filters, page) => {
  const { data } = await axios.get(`/api/product/list?${toParams(filters, page)}`);
  if (!data.success) throw new Error(data.message || "Could not load products");
  return data;
};

// ---------- export / print ----------
const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

const exportRows = (items) =>
  items.flatMap((p) =>
    (p.variants.length ? p.variants : [{}]).map((v) => ({
      Product: p.name,
      Code: p.code,
      Variant: v.label || "",
      Barcode: v.barcode || "",
      SKU: v.sku || "",
      Stock: v.stock ?? 0,
      MRP: v.mrp ?? "",
      "Sale Price": v.sellingPrice ?? "",
      "Purchase Price": p.purchasePrice || "",
      "Dealer Price": p.dealerPrice || "",
      "Min Price": p.minSalePrice || "",
      Brand: p.brand,
      Category: p.category,
      "Sub Category": p.subcategory,
      Website: p.showInWebsite ? "Yes" : "No",
    })),
  );

const downloadCsv = (items) => {
  const rows = exportRows(items);
  if (!rows.length) return;
  const head = Object.keys(rows[0]);
  const csv = [head.map(csvCell).join(","), ...rows.map((r) => head.map((h) => csvCell(r[h])).join(","))].join("\r\n");
  // BOM so Excel opens Bangla / ৳ correctly
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `products-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
};

const escapeHtml = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const printList = (items) => {
  const rows = exportRows(items);
  const win = window.open("", "_blank");
  if (!win) return showToast("error", "Allow pop-ups to print");
  const head = ["Product", "Variant", "Barcode", "Stock", "MRP", "Sale Price", "Dealer Price", "Brand", "Category"];
  win.document.write(`<!doctype html><html><head><title>Product List</title><style>
    body{font-family:Arial,sans-serif;font-size:11px;margin:16px}h2{margin:0 0 8px}
    table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:4px 6px;text-align:left}
    th{background:#eee}td.n{text-align:right}</style></head><body>
    <h2>Product List</h2><p>${new Date().toLocaleString()} · ${items.length} products</p>
    <table><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>
    ${rows
      .map(
        (r) =>
          `<tr>${head
            .map((h) => `<td class="${["Stock", "MRP", "Sale Price", "Dealer Price"].includes(h) ? "n" : ""}">${escapeHtml(r[h])}</td>`)
            .join("")}</tr>`,
      )
      .join("")}
    </tbody></table><script>window.onload=()=>window.print()</script></body></html>`);
  win.document.close();
};

// ---------------------------------------------------------------------------

export default function ShowProduct() {
  const queryClient = useQueryClient();

  // "draft" is what the filter bar shows; "filters" is what was searched
  const [draft, setDraft] = useState(INITIAL_FILTERS);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["product-list", filters, page],
    queryFn: () => fetchList(filters, page),
    placeholderData: keepPreviousData,
  });

  const { data: categories = [] } = useQuery({ ...posCategoriesQueryOptions(), refetchOnWindowFocus: false });
  const { data: showrooms = [] } = useQuery({ ...posShowroomsQueryOptions(), refetchOnWindowFocus: false });

  const { data: subcategories = [] } = useQuery({
    queryKey: ["subcategories", draft.category],
    queryFn: async () => {
      const { data } = await axios.get(`/api/subcategory?category=${draft.category}&deleteType=SD`);
      return data?.data || [];
    },
    enabled: !!draft.category,
    staleTime: 1000 * 60 * 5,
  });

  const items = useMemo(() => data?.items ?? [], [data]);
  const total = data?.total || 0;
  const limit = filters.limit;
  const pages = Math.max(1, Math.ceil(total / limit));
  const from = total ? (page - 1) * limit + 1 : 0;
  const to = Math.min(page * limit, total);

  // changing a dropdown applies at once; the text box waits for Search / Enter
  const setFilter = (key, value) => {
    const next = { ...draft, [key]: value, ...(key === "category" ? { subcategory: "" } : {}) };
    setDraft(next);
    if (key !== "q") {
      setFilters({ ...next, q: filters.q });
      setPage(1);
      setSelected([]);
    }
  };

  const search = (e) => {
    e?.preventDefault();
    setFilters(draft);
    setPage(1);
    setSelected([]);
  };

  const clear = () => {
    setDraft(INITIAL_FILTERS);
    setFilters(INITIAL_FILTERS);
    setPage(1);
    setSelected([]);
  };

  const allOnPage = items.length > 0 && items.every((p) => selected.includes(p._id));
  const toggleAll = () =>
    setSelected(allOnPage ? selected.filter((id) => !items.some((p) => p._id === id)) : [...new Set([...selected, ...items.map((p) => p._id)])]);
  const toggleOne = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const runAction = async (ids, action) => {
    if (!ids.length) return showToast("error", "Select products first");
    if (action === "trash" && !window.confirm(`Move ${ids.length} product(s) to trash?`)) return;
    setBusy(true);
    try {
      const { data: res } = await axios.put("/api/product/bulk", { ids, action });
      showToast(res.success ? "success" : "error", res.message);
      setSelected([]);
      queryClient.invalidateQueries({ queryKey: ["product-list"] });
      queryClient.invalidateQueries({ queryKey: ["pos-products"] });
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Action failed");
    } finally {
      setBusy(false);
    }
  };

  // export / print use every product matching the filters, not only this page
  const withAllRows = async (fn) => {
    setBusy(true);
    try {
      const all = [];
      for (let p = 1; p <= 100; p++) {
        const res = await fetchList({ ...filters, limit: 100 }, p);
        all.push(...res.items);
        if (all.length >= res.total || !res.items.length) break;
      }
      fn(all);
    } catch {
      showToast("error", "Could not export");
    } finally {
      setBusy(false);
    }
  };

  const isTrash = filters.status === "trash";
  const th = "whitespace-nowrap px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide";
  const td = "px-2 py-1.5 align-middle";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <BreadCrumb breadcrumbData={breadcrumbData} />
          <h1 className="text-2xl font-bold">Products</h1>
        </div>
        <Button asChild>
          <Link href={ADMIN_PRODUCT_ADD}>
            <Plus className="size-4" /> Add Product
          </Link>
        </Button>
      </div>

      {/* ================= FILTERS ================= */}
      <form onSubmit={search} className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
          <select className={selectClass} value={draft.limit} onChange={(e) => setFilter("limit", Number(e.target.value))} title="Rows per page">
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} rows
              </option>
            ))}
          </select>
          <select className={selectClass} value={draft.brand} onChange={(e) => setFilter("brand", e.target.value)}>
            <option value="">All Brands</option>
            {(data?.brands || []).map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <select className={selectClass} value={draft.location} onChange={(e) => setFilter("location", e.target.value)} title="Whose stock is shown">
            <option value="all">All Stock</option>
            <option value="warehouse">Warehouse / Godown</option>
            {showrooms.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
          <select className={selectClass} value={draft.sort} onChange={(e) => setFilter("sort", e.target.value)}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name">Name A–Z</option>
            <option value="price-asc">Price Low–High</option>
            <option value="price-desc">Price High–Low</option>
          </select>
          <select className={selectClass} value={draft.status} onChange={(e) => setFilter("status", e.target.value)}>
            <option value="active">Active</option>
            <option value="trash">Trash</option>
          </select>
          <select className={selectClass} value={draft.category} onChange={(e) => setFilter("category", e.target.value)}>
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
          <select className={selectClass} value={draft.subcategory} onChange={(e) => setFilter("subcategory", e.target.value)} disabled={!draft.category}>
            <option value="">All Sub Categories</option>
            {subcategories.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
          <select className={selectClass} value={draft.web} onChange={(e) => setFilter("web", e.target.value)}>
            <option value="">Website: All</option>
            <option value="yes">On website</option>
            <option value="no">POS only</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 focus-within:border-primary sm:max-w-sm dark:border-white/10 dark:bg-card">
            <Search className="size-4 shrink-0 text-gray-400" />
            <input
              value={draft.q}
              onChange={(e) => setFilter("q", e.target.value)}
              placeholder="Product name, code, SKU, barcode..."
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
          <Button type="submit" className="h-9 bg-emerald-600 hover:bg-emerald-700">
            Search
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="secondary" className="h-9" disabled={busy}>
                Action {selected.length > 0 && `(${selected.length})`} <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => runAction(selected, "web-on")}>
                <Eye className="size-4" /> Show on website
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => runAction(selected, "web-off")}>
                <EyeOff className="size-4" /> Hide from website
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {isTrash ? (
                <DropdownMenuItem onClick={() => runAction(selected, "restore")}>
                  <RotateCcw className="size-4" /> Restore
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem className="text-red-600" onClick={() => runAction(selected, "trash")}>
                  <Trash2 className="size-4" /> Move to trash
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button type="button" variant="outline" className="h-9 border-amber-300 text-amber-700 hover:bg-amber-50" onClick={clear}>
            Clear
          </Button>

          <div className="ml-auto flex gap-2">
            <Button type="button" variant="outline" className="h-9" disabled={busy} onClick={() => withAllRows(downloadCsv)}>
              <FileSpreadsheet className="size-4" /> Excel
            </Button>
            <Button type="button" variant="outline" className="h-9" disabled={busy} onClick={() => withAllRows(printList)}>
              <Printer className="size-4" /> Print / PDF
            </Button>
          </div>
        </div>
      </form>

      {/* ================= TABLE ================= */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div>
          <table className="w-full table-fixed text-xs">
            <colgroup>
              <col className="w-8" />
              <col className="w-8" />
              <col />
              <col className="w-[26%]" />
              <col className="w-14" />
              <col className="w-20" />
              <col className="hidden w-24 md:table-column" />
              <col className="hidden w-20 sm:table-column" />
              <col className="w-10" />
            </colgroup>
            <thead className="bg-emerald-600 text-white">
              <tr>
                <th className={th}>
                  <input type="checkbox" className="size-3.5 accent-white" checked={allOnPage} onChange={toggleAll} aria-label="Select all" />
                </th>
                <th className={th}>#</th>
                <th className={th}>Product</th>
                <th className={th}>Barcode · Variant</th>
                <th className={`${th} text-right`}>Stock</th>
                <th className={`${th} text-right`}>Price</th>
                <th className={`${th} hidden text-right md:table-cell`}>Rates</th>
                <th className={`${th} hidden sm:table-cell`}>Status</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-muted-foreground">
                    <Loader2 className="mx-auto mb-2 size-5 animate-spin" /> Loading products...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center">
                    <p className="text-red-600">Could not load products.</p>
                    <Button variant="link" onClick={() => refetch()}>
                      Retry
                    </Button>
                  </td>
                </tr>
              ) : !items.length ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-muted-foreground">
                    No products found
                  </td>
                </tr>
              ) : (
                items.map((p, i) => {
                  const lines = p.variants.length ? p.variants : [null];
                  return (
                    <tr
                      key={p._id}
                      className={`${selected.includes(p._id) ? "bg-primary/5" : p.lowStock ? "bg-red-50/60 dark:bg-red-500/5" : ""} hover:bg-muted/40`}
                    >
                      <td className={td}>
                        <input type="checkbox" className="size-3.5 accent-primary" checked={selected.includes(p._id)} onChange={() => toggleOne(p._id)} />
                      </td>
                      <td className={`${td} text-muted-foreground`}>{(page - 1) * limit + i + 1}</td>

                      {/* picture + name + brand / category */}
                      <td className={td}>
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="relative size-10 shrink-0 overflow-hidden rounded-md border bg-white">
                            <Image
                              src={p.image || "/placeholder.png"}
                              alt=""
                              fill
                              sizes="40px"
                              className="object-contain"
                              unoptimized={skipOptimize(p.image)}
                            />
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={ADMIN_PRODUCT_EDIT(p._id)}
                              className="line-clamp-2 font-medium leading-snug hover:text-primary hover:underline"
                              title={p.name}
                            >
                              {p.name}
                            </Link>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {[p.brand, p.category, p.subcategory].filter(Boolean).join(" · ") || "—"}
                            </p>
                            <p className="truncate text-[10px] text-muted-foreground">
                              {[p.code, p.unit].filter(Boolean).join(" · ")}
                              {p.lowStock && (
                                <span className="ml-1 rounded bg-red-100 px-1 font-semibold text-red-700">Low stock</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className={`${td} font-mono text-[11px]`}>
                        {lines.map((v, k) =>
                          v ? (
                            <div key={v._id} className="truncate leading-5" title={`${v.barcode || v.sku} ${v.label}`}>
                              {v.barcode || v.sku}
                              {v.label && <span className="font-sans text-muted-foreground"> · {v.label}</span>}
                            </div>
                          ) : (
                            <Link key={k} href={ADMIN_PRODUCT_EDIT(p._id)} className="font-sans text-amber-600 hover:underline">
                              No variants — add
                            </Link>
                          ),
                        )}
                      </td>

                      <td className={`${td} text-right tabular-nums`}>
                        {lines.map((v, k) => (
                          <div key={k} className={`leading-5 ${v && v.stock <= 0 ? "text-red-600" : ""}`}>
                            {v ? v.stock : "—"}
                          </div>
                        ))}
                        {p.variants.length > 1 && (
                          <div className="border-t font-semibold leading-5">{p.totalStock}</div>
                        )}
                      </td>

                      {/* sale price, MRP struck through when higher */}
                      <td className={`${td} text-right tabular-nums`}>
                        {lines.map((v, k) => (
                          <div key={k} className="whitespace-nowrap leading-5">
                            {v ? (
                              <>
                                {v.mrp > v.sellingPrice && (
                                  <span className="mr-1 text-[10px] text-muted-foreground line-through">{money(v.mrp)}</span>
                                )}
                                <span className="font-semibold">{money(v.sellingPrice)}</span>
                              </>
                            ) : (
                              "—"
                            )}
                          </div>
                        ))}
                      </td>

                      <td className={`${td} hidden text-right text-[11px] tabular-nums md:table-cell`}>
                        <div title="Purchase price">
                          <span className="text-muted-foreground">P </span>
                          {p.purchasePrice ? money(p.purchasePrice) : "—"}
                        </div>
                        <div title="Dealer price" className="text-emerald-700">
                          <span className="text-muted-foreground">D </span>
                          {p.dealerPrice ? money(p.dealerPrice) : "—"}
                        </div>
                        {p.minSalePrice > 0 && (
                          <div title="Minimum sale price">
                            <span className="text-muted-foreground">Min </span>
                            {money(p.minSalePrice)}
                          </div>
                        )}
                      </td>

                      <td className={`${td} hidden sm:table-cell`}>
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              p.deleted ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {p.deleted ? "Trash" : "Active"}
                          </span>
                          <button
                            type="button"
                            disabled={busy || isTrash}
                            onClick={() => runAction([p._id], p.showInWebsite ? "web-off" : "web-on")}
                            title="Click to change"
                            className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              p.showInWebsite ? "bg-sky-100 text-sky-700" : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {p.showInWebsite ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                            Web
                          </button>
                        </div>
                      </td>

                      <td className={td}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="size-7" aria-label="Actions">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={ADMIN_PRODUCT_EDIT(p._id)}>
                                <Pencil className="size-4" /> Edit / Variants
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => runAction([p._id], p.showInWebsite ? "web-off" : "web-on")}>
                              {p.showInWebsite ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                              {p.showInWebsite ? "Hide from website" : "Show on website"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {p.deleted ? (
                              <DropdownMenuItem onClick={() => runAction([p._id], "restore")}>
                                <RotateCcw className="size-4" /> Restore
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem className="text-red-600" onClick={() => runAction([p._id], "trash")}>
                                <Trash2 className="size-4" /> Move to trash
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ================= PAGINATION ================= */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            {isFetching && !isLoading && <Loader2 className="mr-1 inline size-3.5 animate-spin" />}
            Showing {from}–{to} of {total} products
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>
              <ChevronLeft className="size-4" /> Prev
            </Button>
            <span className="tabular-nums">
              {page} / {pages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((n) => n + 1)}>
              Next <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
